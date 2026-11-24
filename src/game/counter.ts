import type { Card } from "./types";
import { RANK_LABEL } from "./types";

export const COUNTER_RANKS: number[] = Array.from(
  { length: 15 },
  (_, i) => i + 3,
);

const TOTAL: Record<number, number> = {};
for (const rank of COUNTER_RANKS) TOTAL[rank] = rank >= 16 ? 1 : 4;

export interface CounterItem {
  rank: number;
  label: string;
  left: number;
}

export function counterRankLabel(rank: number): string {
  if (rank <= 15) return String(RANK_LABEL[rank] ?? rank);
  return rank === 16 ? "小王" : "大王";
}

function decrease(counts: Record<number, number>, rank: number): void {
  if (rank in counts) counts[rank] = Math.max(0, counts[rank] - 1);
}

export function buildCardCounter(
  played: Card[],
  hand: Card[],
): CounterItem[] {
  const left = { ...TOTAL };
  for (const card of played) decrease(left, card.rank);
  for (const card of hand) decrease(left, card.rank);
  return COUNTER_RANKS.map((rank) => ({
    rank,
    label: counterRankLabel(rank),
    left: left[rank] ?? 0,
  }));
}
