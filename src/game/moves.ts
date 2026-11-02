import type { Card, PlayInfo } from "./types";
import { canBeat, groupByRank, parsePlay } from "./rules";

export interface Move {
  cards: Card[];
  info: PlayInfo;
}

export interface MoveContext {
  isFarmer: boolean;
  lastPlayerIsTeammate: boolean;
  lastPlayerCardCount: number;
}

function keyOf(cards: Card[]): string {
  return cards
    .map((c) => c.id)
    .sort()
    .join("|");
}

function makeMove(cards: Card[]): Move | null {
  const info = parsePlay(cards);
  return info ? { cards, info } : null;
}

function pickKickers(
  hand: Card[],
  used: Card[],
  count: number,
  asPairs: boolean,
  excludeRanks: Set<number>,
): Card[] | null {
  const usedIds = new Set(used.map((c) => c.id));
  const remaining = hand.filter(
    (c) => !usedIds.has(c.id) && !excludeRanks.has(c.rank),
  );
  const groups = groupByRank(remaining);

  if (asPairs) {
    const rankList = [...groups.keys()]
      .filter((r) => groups.get(r)!.length >= 2)
      .sort((a, b) => {
        const la = groups.get(a)!.length;
        const lb = groups.get(b)!.length;
        const pa = la === 2 ? 0 : 1;
        const pb = lb === 2 ? 0 : 1;
        return pa - pb || a - b;
      });
    if (rankList.length < count) return null;
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push(...groups.get(rankList[i])!.slice(0, 2));
    }
    return cards;
  }

  const sorted = remaining.slice().sort((a, b) => {
    const la = groups.get(a.rank)!.length;
    const lb = groups.get(b.rank)!.length;
    const pa = la === 1 ? 0 : 1;
    const pb = lb === 1 ? 0 : 1;
    return pa - pb || a.rank - b.rank;
  });
  if (sorted.length < count) return null;
  return sorted.slice(0, count);
}

function collectBounds(
  groups: Map<number, Card[]>,
  start: number,
  count: number,
  perRank: number,
): Card[] | null {
  const cards: Card[] = [];
  for (let rank = start; rank < start + count; rank++) {
    const group = groups.get(rank);
    if (!group || group.length < perRank) return null;
    cards.push(...group.slice(0, perRank));
  }
  return cards;
}

export function generateBeatingMoves(hand: Card[], last: PlayInfo): Move[] {
  const groups = groupByRank(hand);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const result: Move[] = [];
  const seen = new Set<string>();

  const add = (cards: Card[] | null): void => {
    if (!cards) return;
    const move = makeMove(cards);
    if (!move || !canBeat(move.info, last)) return;
    const key = keyOf(cards);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(move);
  };

  switch (last.type) {
    case "single":
      for (const rank of ranks) {
        if (rank > last.rank) add([groups.get(rank)![0]]);
      }
      break;
    case "pair":
      for (const rank of ranks) {
        if (rank > last.rank && groups.get(rank)!.length >= 2) {
          add(groups.get(rank)!.slice(0, 2));
        }
      }
      break;
    case "triple":
      for (const rank of ranks) {
        if (rank > last.rank && groups.get(rank)!.length >= 3) {
          add(groups.get(rank)!.slice(0, 3));
        }
      }
      break;
    case "tripleWithOne":
    case "tripleWithTwo": {
      const asPairs = last.type === "tripleWithTwo";
      for (const rank of ranks) {
        if (rank <= last.rank || groups.get(rank)!.length < 3) continue;
        const used = groups.get(rank)!.slice(0, 3);
        const kicker = pickKickers(hand, used, 1, asPairs, new Set([rank]));
        if (kicker) add([...used, ...kicker]);
      }
      break;
    }
    case "straight": {
      const length = last.length;
      for (let start = 3; start + length - 1 <= 14; start++) {
        if (start + length - 1 <= last.rank) continue;
        add(collectBounds(groups, start, length, 1));
      }
      break;
    }
    case "doubleStraight": {
      const pairs = last.length / 2;
      for (let start = 3; start + pairs - 1 <= 14; start++) {
        if (start + pairs - 1 <= last.rank) continue;
        add(collectBounds(groups, start, pairs, 2));
      }
      break;
    }
    case "plane":
    case "planeWithOne":
    case "planeWithTwo": {
      const wing = last.type === "plane" ? 0 : last.type === "planeWithOne" ? 1 : 2;
      const unit = 3 + wing;
      const n = last.length / unit;
      for (let start = 3; start + n - 1 <= 14; start++) {
        if (start + n - 1 <= last.rank) continue;
        const used = collectBounds(groups, start, n, 3);
        if (!used) continue;
        if (wing === 0) {
          add(used);
          continue;
        }
        const exclude = new Set<number>();
        for (let r = start; r < start + n; r++) exclude.add(r);
        const kicker = pickKickers(hand, used, n, wing === 2, exclude);
        if (kicker) add([...used, ...kicker]);
      }
      break;
    }
    case "bomb":
    case "kingBomb":
      break;
  }

  if (last.type !== "kingBomb") {
    const minBomb = last.type === "bomb" ? last.rank : -1;
    for (const rank of ranks) {
      if (rank > minBomb && groups.get(rank)!.length >= 4) {
        add(groups.get(rank)!.slice(0, 4));
      }
    }
    if (groups.has(16) && groups.has(17)) {
      add([groups.get(16)![0], groups.get(17)![0]]);
    }
  }

  return result;
}

export function generateAllMoves(hand: Card[]): Move[] {
  const groups = groupByRank(hand);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const result: Move[] = [];
  const seen = new Set<string>();

  const add = (cards: Card[] | null): void => {
    if (!cards) return;
    const move = makeMove(cards);
    if (!move) return;
    const key = keyOf(cards);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(move);
  };

  for (const rank of ranks) {
    const group = groups.get(rank)!;
    add([group[0]]);
    if (group.length >= 2) add(group.slice(0, 2));
    if (group.length >= 3) add(group.slice(0, 3));
    if (group.length >= 4) add(group.slice(0, 4));

    if (group.length >= 3) {
      const used = group.slice(0, 3);
      const one = pickKickers(hand, used, 1, false, new Set([rank]));
      if (one) add([...used, ...one]);
      const two = pickKickers(hand, used, 1, true, new Set([rank]));
      if (two) add([...used, ...two]);
    }
  }

  if (groups.has(16) && groups.has(17)) {
    add([groups.get(16)![0], groups.get(17)![0]]);
  }

  for (let length = 5; length <= 12; length++) {
    for (let start = 3; start + length - 1 <= 14; start++) {
      add(collectBounds(groups, start, length, 1));
    }
  }

  for (let pairs = 3; pairs <= 12; pairs++) {
    for (let start = 3; start + pairs - 1 <= 14; start++) {
      add(collectBounds(groups, start, pairs, 2));
    }
  }

  for (let n = 2; n <= 6; n++) {
    for (let start = 3; start + n - 1 <= 14; start++) {
      const used = collectBounds(groups, start, n, 3);
      if (!used) continue;
      add(used);
      const exclude = new Set<number>();
      for (let r = start; r < start + n; r++) exclude.add(r);
      const ones = pickKickers(hand, used, n, false, exclude);
      if (ones) add([...used, ...ones]);
      const twos = pickKickers(hand, used, n, true, exclude);
      if (twos) add([...used, ...twos]);
    }
  }

  return result;
}

function leaderScore(move: Move, handCounts: Map<number, number>): number {
  let score = move.info.rank * 8 - move.cards.length * 12;
  if (move.info.type === "bomb") score += 900;
  if (move.info.type === "kingBomb") score += 1200;

  const usedCounts = new Map<number, number>();
  for (const card of move.cards) {
    usedCounts.set(card.rank, (usedCounts.get(card.rank) ?? 0) + 1);
  }

  for (const [rank, used] of usedCounts) {
    const total = handCounts.get(rank) ?? 0;
    if (total === 4 && used < 4) score += 400;
    if (total === 2 && used === 1) score += 26;
    if (total === 3 && used === 1) score += 36;
    if (total >= 3 && used === 2) score += 18;
    if (total - used === 1 && total > 1) score += 20;
  }

  return score;
}

export function chooseMove(
  hand: Card[],
  last: PlayInfo | null,
  context: MoveContext,
): Move | null {
  if (last) {
    const moves = generateBeatingMoves(hand, last);
    if (moves.length === 0) return null;

    const finisher = moves.find((m) => m.cards.length === hand.length);
    if (context.lastPlayerIsTeammate) {
      return finisher ?? null;
    }

    const normal = moves.filter(
      (m) => m.info.type !== "bomb" && m.info.type !== "kingBomb",
    );
    if (normal.length > 0) {
      const handCounts = new Map<number, number>();
      for (const [rank, cards] of groupByRank(hand)) {
        handCounts.set(rank, cards.length);
      }
      normal.sort(
        (a, b) =>
          a.info.rank - b.info.rank ||
          a.cards.length - b.cards.length ||
          leaderScore(a, handCounts) - leaderScore(b, handCounts),
      );
      return normal[0];
    }

    const allowBomb =
      context.lastPlayerCardCount <= 2 || hand.length <= 4 || !context.isFarmer;
    if (!allowBomb) return null;

    moves.sort((a, b) => a.info.rank - b.info.rank);
    return moves[0];
  }

  const moves = generateAllMoves(hand);
  if (moves.length === 0) return null;

  const finisher =
    moves.find(
      (m) =>
        m.cards.length === hand.length &&
        m.info.type !== "bomb" &&
        m.info.type !== "kingBomb",
    ) ?? moves.find((m) => m.cards.length === hand.length);
  if (finisher) return finisher;

  const handCounts = new Map<number, number>();
  for (const [rank, cards] of groupByRank(hand)) handCounts.set(rank, cards.length);

  const normal = moves.filter(
    (m) => m.info.type !== "bomb" && m.info.type !== "kingBomb",
  );
  if (normal.length === 0) {
    return moves.slice().sort((a, b) => a.info.rank - b.info.rank)[0];
  }

  let best = normal[0];
  let bestScore = leaderScore(best, handCounts);
  for (const move of normal.slice(1)) {
    const score = leaderScore(move, handCounts);
    if (score < bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

export function chooseCall(hand: Card[]): boolean {
  const groups = groupByRank(hand);
  let score = 0;
  if (groups.has(17)) score += 4;
  if (groups.has(16)) score += 3;

  for (const [rank, cards] of groups) {
    if (rank === 15) score += 1.4 * cards.length;
    else if (rank === 14) score += 0.7 * cards.length;
    else if (rank === 13) score += 0.4 * cards.length;
    if (cards.length === 4) score += 3;
  }

  score += Math.random() * 3.5;
  return score >= 6;
}
