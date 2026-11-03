import type { Card, PlayInfo } from "../src/game/types";
import { groupByRank } from "../src/game/rules";
import { generateAllMoves, generateBeatingMoves, type Move } from "../src/game/moves";
import type { MoveContext } from "../src/game/ai";

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

export function chooseMoveBaseline(
  hand: Card[],
  last: PlayInfo | null,
  context: MoveContext,
): Move | null {
  const lastOwner = context.players.find(
    (p) => p.uid === context.lastPlayerUid,
  );
  const isFarmer = !context.self.isLandlord;
  const lastPlayerIsTeammate =
    !!lastOwner && !lastOwner.isLandlord && isFarmer;

  if (last) {
    const moves = generateBeatingMoves(hand, last);
    if (moves.length === 0) return null;

    const finisher = moves.find((m) => m.cards.length === hand.length);
    if (lastPlayerIsTeammate) {
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
      (lastOwner?.handCount ?? 99) <= 2 || hand.length <= 4 || !isFarmer;
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
  for (const [rank, cards] of groupByRank(hand)) {
    handCounts.set(rank, cards.length);
  }

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

export function chooseCallBaseline(hand: Card[]): boolean {
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
