// DouZero-WP ONNX inference. Models: https://github.com/kwai/DouZero (Apache-2.0).
// Encoder reference: https://github.com/Sanotsu/landlord
import * as ort from "onnxruntime-web/wasm";
import type { Card, PlayInfo } from "./types";
import { generateAllMoves, generateBeatingMoves, type Move } from "./moves";

export type DouZeroRole = "landlord" | "landlord_up" | "landlord_down";

export interface DouZeroSeat {
  uid: string;
  isLandlord: boolean;
  handCount: number;
}

export interface DouZeroInput {
  myUid: string;
  players: DouZeroSeat[];
  myHand: Card[];
  landlordUid: string;
  playedCards: Card[];
  playedBySeat: Record<string, Card[]>;
  lastMoveBySeat: Record<string, Card[]>;
  actionSeq: Card[][];
  last: PlayInfo | null;
  canPass: boolean;
}

export type DouZeroChoice =
  | { kind: "move"; move: Move }
  | { kind: "pass" }
  | null;

const TARGET_BASE = (() => {
  if (typeof document === "undefined") return null;
  try {
    return new URL(".", document.baseURI);
  } catch {
    return null;
  }
})();

const MODEL_FILES: Record<DouZeroRole, string> = {
  landlord: "landlord.onnx",
  landlord_up: "landlord_up.onnx",
  landlord_down: "landlord_down.onnx",
};

const sessions = new Map<DouZeroRole, ort.InferenceSession>();
const loading = new Map<DouZeroRole, Promise<void>>();
const failedAt = new Map<DouZeroRole, number>();
let wasmConfigured = false;
let warned = false;

function configureWasm(): void {
  if (wasmConfigured || !TARGET_BASE) return;
  ort.env.wasm.wasmPaths = new URL("ort/", TARGET_BASE).href;
  ort.env.wasm.numThreads = 1;
  wasmConfigured = true;
}

function modelUrl(role: DouZeroRole): string | null {
  if (!TARGET_BASE) return null;
  return new URL(`models/douzero_wp/${MODEL_FILES[role]}`, TARGET_BASE).href;
}

function ensureSession(role: DouZeroRole): void {
  if (sessions.has(role) || loading.has(role)) return;
  if (Date.now() - (failedAt.get(role) ?? 0) < 60000) return;
  configureWasm();
  const url = modelUrl(role);
  if (!url) return;
  const task = ort.InferenceSession.create(url, {
    executionProviders: ["wasm"],
  })
    .then((session) => {
      sessions.set(role, session);
      failedAt.delete(role);
    })
    .catch((error) => {
      failedAt.set(role, Date.now());
      if (!warned) {
        warned = true;
        console.warn("DouZero model load failed, using heuristic AI", error);
      }
    })
    .finally(() => {
      loading.delete(role);
    });
  loading.set(role, task);
}

function readySession(role: DouZeroRole): ort.InferenceSession | null {
  ensureSession(role);
  return sessions.get(role) ?? null;
}

export function preloadDouZero(): void {
  if (typeof window === "undefined" || !TARGET_BASE) return;
  ensureSession("landlord");
  ensureSession("landlord_up");
  ensureSession("landlord_down");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("DouZero inference timeout")),
      ms,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function douzeroCard(rank: number): number {
  if (rank >= 3 && rank <= 14) return rank;
  if (rank === 15) return 17;
  if (rank === 16) return 20;
  if (rank === 17) return 30;
  return 0;
}

function cardColumn(card: number): number {
  if (card >= 3 && card <= 14) return card - 3;
  if (card === 17) return 12;
  return -1;
}

function cardsToArray(cards: Card[]): Float32Array {
  const out = new Float32Array(54);
  const counts = new Map<number, number>();
  for (const card of cards) {
    const dz = douzeroCard(card.rank);
    if (dz > 0) counts.set(dz, (counts.get(dz) ?? 0) + 1);
  }
  for (const [cardValue, count] of counts) {
    if (cardValue === 20) {
      out[52] = 1;
      continue;
    }
    if (cardValue === 30) {
      out[53] = 1;
      continue;
    }
    const column = cardColumn(cardValue);
    if (column < 0) continue;
    for (let i = 0; i < Math.min(4, count); i++) {
      out[column * 4 + i] = 1;
    }
  }
  return out;
}

function oneHotNumLeft(count: number, max: number): Float32Array {
  const out = new Float32Array(max);
  if (count >= 1 && count <= max) out[count - 1] = 1;
  return out;
}

function oneHotBombNum(count: number): Float32Array {
  const out = new Float32Array(15);
  if (count >= 0 && count < 15) out[count] = 1;
  return out;
}

function bombValue(cards: Card[]): number {
  if (cards.length === 2) {
    return cards.every((card) => card.rank >= 16) ? 1 : 0;
  }
  if (cards.length < 4 || cards.length % 4 !== 0) return 0;
  const counts = new Map<number, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  const values = [...counts.values()];
  return values.every((n) => n === 4) ? values.length : 0;
}

function countBombs(actionSeq: Card[][]): number {
  let bombs = 0;
  for (const action of actionSeq) {
    bombs += bombValue(action);
  }
  return Math.max(0, Math.min(14, bombs));
}

function lastMoveCards(actionSeq: Card[][]): Card[] {
  if (actionSeq.length === 0) return [];
  const last = actionSeq[actionSeq.length - 1];
  if (last.length > 0) return last;
  if (actionSeq.length >= 2) return actionSeq[actionSeq.length - 2];
  return [];
}

function unknownCards(hand: Card[], played: Card[]): Card[] {
  const counts = new Array<number>(18).fill(0);
  for (let rank = 3; rank <= 15; rank++) counts[rank] = 4;
  counts[16] = 1;
  counts[17] = 1;
  for (const card of hand) counts[card.rank]--;
  for (const card of played) counts[card.rank]--;
  const out: Card[] = [];
  for (let rank = 3; rank <= 17; rank++) {
    const count = Math.max(0, counts[rank] ?? 0);
    for (let i = 0; i < count; i++) {
      out.push({
        id: `unknown-${rank}-${i}`,
        rank,
        suit: rank >= 16 ? "joker" : "spade",
      });
    }
  }
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function seatIndexOf(players: DouZeroSeat[], uid: string): number {
  return players.findIndex((player) => player.uid === uid);
}

function roleForSeat(
  players: DouZeroSeat[],
  landlordUid: string,
  seat: number,
): DouZeroRole {
  const landlord = seatIndexOf(players, landlordUid);
  if (seat === landlord) return "landlord";
  if (landlord < 0) return "landlord_up";
  return (seat - landlord + 3) % 3 === 1
    ? "landlord_down"
    : "landlord_up";
}

function landlordNoAction(input: DouZeroInput): Float32Array {
  const landlord = seatIndexOf(input.players, input.landlordUid);
  const up = (landlord + 1) % 3;
  const down = (landlord + 2) % 3;
  const upPlayer = input.players[up];
  const downPlayer = input.players[down];
  const upPlayed = input.playedBySeat[upPlayer?.uid ?? ""] ?? [];
  const downPlayed = input.playedBySeat[downPlayer?.uid ?? ""] ?? [];

  return concat([
    cardsToArray(input.myHand),
    cardsToArray(unknownCards(input.myHand, input.playedCards)),
    cardsToArray(lastMoveCards(input.actionSeq)),
    cardsToArray(downPlayed),
    cardsToArray(upPlayed),
    oneHotNumLeft(downPlayer?.handCount ?? 0, 17),
    oneHotNumLeft(upPlayer?.handCount ?? 0, 17),
    oneHotBombNum(countBombs(input.actionSeq)),
  ]);
}

function farmerNoAction(input: DouZeroInput, seat: number): Float32Array {
  const landlord = seatIndexOf(input.players, input.landlordUid);
  const landlordPlayer = input.players[landlord];
  const teammateSeat = input.players.findIndex(
    (_player, index) => index !== seat && index !== landlord,
  );
  const teammate = input.players[teammateSeat];
  const landlordUid = landlordPlayer?.uid ?? "";
  const teammateUid = teammate?.uid ?? "";

  return concat([
    cardsToArray(input.myHand),
    cardsToArray(unknownCards(input.myHand, input.playedCards)),
    cardsToArray(input.playedBySeat[landlordUid] ?? []),
    cardsToArray(input.playedBySeat[teammateUid] ?? []),
    cardsToArray(lastMoveCards(input.actionSeq)),
    cardsToArray(input.lastMoveBySeat[landlordUid] ?? []),
    cardsToArray(input.lastMoveBySeat[teammateUid] ?? []),
    oneHotNumLeft(landlordPlayer?.handCount ?? 0, 20),
    oneHotNumLeft(teammate?.handCount ?? 0, 17),
    oneHotBombNum(countBombs(input.actionSeq)),
  ]);
}

function encodeZ(actionSeq: Card[][]): Float32Array {
  const seqLen = 15;
  const available =
    actionSeq.length > seqLen ? actionSeq.slice(-seqLen) : actionSeq;
  const offset = seqLen - available.length;
  const out = new Float32Array(5 * 162);
  for (let r = 0; r < 5; r++) {
    for (let k = 0; k < 3; k++) {
      const index = r * 3 + k - offset;
      const move = index >= 0 && index < available.length
        ? available[index]
        : [];
      out.set(cardsToArray(move), r * 162 + k * 54);
    }
  }
  return out;
}

function encodeX(
  input: DouZeroInput,
  seat: number,
  candidates: Card[][],
  role: DouZeroRole,
): Float32Array {
  const noAction =
    role === "landlord"
      ? landlordNoAction(input)
      : farmerNoAction(input, seat);
  const xDim = role === "landlord" ? 373 : 484;
  const out = new Float32Array(candidates.length * xDim);
  for (let i = 0; i < candidates.length; i++) {
    const base = i * xDim;
    out.set(noAction, base);
    out.set(cardsToArray(candidates[i]), base + noAction.length);
  }
  return out;
}

function buildCandidates(
  hand: Card[],
  last: PlayInfo | null,
  canPass: boolean,
): { cards: Card[]; move: Move | null }[] {
  const moves = last
    ? generateBeatingMoves(hand, last)
    : generateAllMoves(hand);
  const seen = new Set<string>();
  const out: { cards: Card[]; move: Move | null }[] = [];
  for (const move of moves) {
    const key = move.cards
      .map((card) => card.id)
      .sort()
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ cards: move.cards, move });
  }
  if (last && canPass) {
    out.push({ cards: [], move: null });
  }
  return out;
}

function argmax(values: Float32Array): number {
  let best = 0;
  let bestValue = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > bestValue) {
      bestValue = values[i];
      best = i;
    }
  }
  return best;
}

export async function chooseDouZeroMove(
  input: DouZeroInput,
): Promise<DouZeroChoice> {
  if (!TARGET_BASE || input.players.length !== 3) return null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return null;
  }
  const seat = seatIndexOf(input.players, input.myUid);
  if (seat < 0) return null;
  if (seatIndexOf(input.players, input.landlordUid) < 0) return null;

  const candidates = buildCandidates(input.myHand, input.last, input.canPass);
  if (candidates.length === 0) {
    return input.canPass ? { kind: "pass" } : null;
  }
  if (candidates.length === 1) {
    const only = candidates[0];
    return only.move ? { kind: "move", move: only.move } : { kind: "pass" };
  }

  const role = roleForSeat(input.players, input.landlordUid, seat);
  const z = encodeZ(input.actionSeq);
  const x = encodeX(
    input,
    seat,
    candidates.map((candidate) => candidate.cards),
    role,
  );
  const n = candidates.length;
  const zBatch = new Float32Array(n * z.length);
  for (let i = 0; i < n; i++) zBatch.set(z, i * z.length);

  const session = readySession(role);
  if (!session) return null;

  try {
    const feeds: Record<string, ort.Tensor> = {
      z: new ort.Tensor("float32", zBatch, [n, 5, 162]),
      x: new ort.Tensor("float32", x, [n, role === "landlord" ? 373 : 484]),
    };
    const output = await withTimeout(session.run(feeds), 5000);
    const first = Object.values(output)[0] as ort.Tensor;
    const data = first?.data as Float32Array | undefined;
    if (!data || data.length < n) return null;
    const best = argmax(data);
    const chosen = candidates[best];
    return chosen.move ? { kind: "move", move: chosen.move } : { kind: "pass" };
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn("DouZero inference failed, using heuristic AI", error);
    }
    return null;
  }
}
