import type { Card, CardType, PlayInfo } from "./types";

// 连炸仅在「不洗牌模式」启用；由游戏 store 在开局时设置
let bombStraightEnabled = false;

export function setBombStraightEnabled(enabled: boolean): void {
  bombStraightEnabled = enabled;
}

export function isBombStraightEnabled(): boolean {
  return bombStraightEnabled;
}

export function groupByRank(cards: Card[]): Map<number, Card[]> {
  const map = new Map<number, Card[]>();
  for (const card of cards) {
    const list = map.get(card.rank);
    if (list) list.push(card);
    else map.set(card.rank, [card]);
  }
  return map;
}

function isConsecutive(ranks: number[]): boolean {
  if (ranks.length === 0) return false;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return ranks[ranks.length - 1] <= 14;
}

function consecutiveRuns(ranks: number[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (const rank of ranks) {
    if (current.length === 0 || rank === current[current.length - 1] + 1) {
      current.push(rank);
    } else {
      runs.push(current);
      current = [rank];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

interface PlaneCheck {
  rank: number;
  type: CardType;
}

function detectPlaneWithWings(
  ranks: number[],
  counts: Map<number, number>,
  total: number,
  wingSize: 1 | 2,
): PlaneCheck | null {
  const tripleRanks = ranks.filter((r) => (counts.get(r) ?? 0) === 3 && r <= 14);
  if (tripleRanks.length < 2) return null;

  const unit = wingSize === 1 ? 4 : 5;
  if (total % unit !== 0) return null;
  const n = total / unit;
  if (n < 2) return null;

  let best: number | null = null;

  for (const run of consecutiveRuns(tripleRanks)) {
    if (run.length < n) continue;
    for (let start = 0; start + n <= run.length; start++) {
      const seq = run.slice(start, start + n);
      // wings: everything except the 3 cards of each sequence rank
      const wingCounts = new Map<number, number>();
      let wingTotal = 0;
      for (const [rank, count] of counts) {
        if (seq.includes(rank)) continue;
        wingCounts.set(rank, count);
        wingTotal += count;
      }
      if (wingTotal !== n * wingSize) continue;

      let valid = true;
      if (wingSize === 2) {
        if (wingCounts.size !== n) valid = false;
        for (const count of wingCounts.values()) {
          if (count !== 2) valid = false;
        }
      }
      if (!valid) continue;

      const main = seq[seq.length - 1];
      if (best === null || main > best) best = main;
    }
  }

  if (best === null) return null;
  return { rank: best, type: wingSize === 1 ? "planeWithOne" : "planeWithTwo" };
}

export function parsePlay(cards: Card[]): PlayInfo | null {
  const n = cards.length;
  if (n === 0) return null;

  const groups = groupByRank(cards);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, groups.get(rank)!.length);
  const countList = ranks.map((r) => counts.get(r)!);

  if (n === 2 && groups.has(16) && groups.has(17)) {
    return { type: "kingBomb", rank: 100, length: 2 };
  }

  if (n === 4 && ranks.length === 1) {
    return { type: "bomb", rank: ranks[0], length: 4 };
  }

  // 连炸：两个或以上相邻点数的炸弹（2 和王不能参与连炸）
  if (
    bombStraightEnabled &&
    n >= 8 &&
    n % 4 === 0 &&
    ranks.length === n / 4 &&
    countList.every((c) => c === 4) &&
    isConsecutive(ranks)
  ) {
    return {
      type: "bombStraight",
      rank: ranks[ranks.length - 1],
      length: n,
    };
  }

  if (n === 1) return { type: "single", rank: ranks[0], length: 1 };
  if (n === 2 && ranks.length === 1)
    return { type: "pair", rank: ranks[0], length: 2 };
  if (n === 3 && ranks.length === 1)
    return { type: "triple", rank: ranks[0], length: 3 };

  if (n === 4 && ranks.length === 2 && countList.includes(3)) {
    return {
      type: "tripleWithOne",
      rank: ranks[countList.indexOf(3)],
      length: 4,
    };
  }
  if (n === 5 && ranks.length === 2 && countList.includes(3)) {
    return {
      type: "tripleWithTwo",
      rank: ranks[countList.indexOf(3)],
      length: 5,
    };
  }

  const fourRankIndex = countList.indexOf(4);
  if (n === 6 && fourRankIndex >= 0) {
    return {
      type: "fourWithTwo",
      rank: ranks[fourRankIndex],
      length: 6,
    };
  }
  if (
    n === 8 &&
    fourRankIndex >= 0 &&
    countList.filter((c) => c === 2).length === 2
  ) {
    return {
      type: "fourWithTwoPairs",
      rank: ranks[fourRankIndex],
      length: 8,
    };
  }

  if (n >= 5 && ranks.length === n && isConsecutive(ranks)) {
    return { type: "straight", rank: ranks[ranks.length - 1], length: n };
  }

  if (
    n >= 6 &&
    n % 2 === 0 &&
    ranks.length === n / 2 &&
    countList.every((c) => c === 2) &&
    ranks.length >= 3 &&
    isConsecutive(ranks)
  ) {
    return {
      type: "doubleStraight",
      rank: ranks[ranks.length - 1],
      length: n,
    };
  }

  if (
    n >= 6 &&
    n % 3 === 0 &&
    ranks.length === n / 3 &&
    countList.every((c) => c === 3) &&
    ranks.length >= 2 &&
    isConsecutive(ranks)
  ) {
    return { type: "plane", rank: ranks[ranks.length - 1], length: n };
  }

  const withOne = detectPlaneWithWings(ranks, counts, n, 1);
  if (withOne) return { type: withOne.type, rank: withOne.rank, length: n };

  const withTwo = detectPlaneWithWings(ranks, counts, n, 2);
  if (withTwo) return { type: withTwo.type, rank: withTwo.rank, length: n };

  return null;
}

export function canBeat(candidate: PlayInfo, last: PlayInfo): boolean {
  // 连炸 > 王炸 > 普通炸弹 > 普通牌型
  if (candidate.type === "bombStraight") {
    if (last.type === "bombStraight") {
      if (candidate.length !== last.length) {
        return candidate.length > last.length;
      }
      return candidate.rank > last.rank;
    }
    return true;
  }
  if (last.type === "bombStraight") return false;

  if (candidate.type === "kingBomb") return true;
  if (last.type === "kingBomb") return false;
  if (candidate.type === "bomb") {
    return last.type !== "bomb" || candidate.rank > last.rank;
  }
  if (last.type === "bomb") return false;
  return (
    candidate.type === last.type &&
    candidate.length === last.length &&
    candidate.rank > last.rank
  );
}

export function cardText(card: Card): string {
  if (card.rank === 16) return "小王";
  if (card.rank === 17) return "大王";
  const names: Record<number, string> = {
    11: "J",
    12: "Q",
    13: "K",
    14: "A",
    15: "2",
  };
  return names[card.rank] ?? String(card.rank);
}
