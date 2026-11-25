import type { Card, Suit } from "./types";

const SUITS: Suit[] = ["spade", "heart", "club", "diamond"];
const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 3; rank <= 15; rank++) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  deck.push({ id: "joker-16", suit: "joker", rank: 16 });
  deck.push({ id: "joker-17", suit: "joker", rank: 17 });
  return deck;
}

export function shuffle<T>(input: T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortCards(cards: Card[]): Card[] {
  return cards.slice().sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return a.suit.localeCompare(b.suit);
  });
}

export interface DealResult {
  hands: Card[][];
  bottom: Card[];
}

function cardOf(suit: Suit, rank: number): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

/** 经典模式：洗牌后逐张轮流发牌 */
function dealClassic(): DealResult {
  const deck = shuffle(createDeck());
  const hands: Card[][] = [[], [], []];
  for (let i = 0; i < 51; i++) {
    hands[i % 3].push(deck[i]);
  }
  const bottom = deck.slice(51);
  return {
    hands: hands.map((h) => sortCards(h)),
    bottom: sortCards(bottom),
  };
}

/**
 * 不洗牌模式：欢乐斗地主的特殊算法。
 * 直接把整组同点数牌（炸弹）发给三家，保证每手都有多个炸弹；
 * 剩余牌再均匀补齐，凑成 17 / 17 / 17 + 3 张底牌。
 */
function dealBombHeavy(): DealResult {
  const hands: Card[][] = [[], [], []];
  const used = new Set<string>();

  // 每手保证 3~4 个炸弹，三家都是如此
  const bombCounts = [0, 0, 0].map(() =>
    Math.random() < 0.25 ? 4 : 3,
  );

  // 约 30% 概率额外出现王炸，加在某一家（不挤占原有炸弹个数）
  if (Math.random() < 0.3) {
    const owner = Math.floor(Math.random() * 3);
    if (bombCounts[owner] >= 4) bombCounts[owner] = 3;
    for (const card of [
      { id: "joker-16", suit: "joker" as Suit, rank: 16 },
      { id: "joker-17", suit: "joker" as Suit, rank: 17 },
    ]) {
      hands[owner].push(card);
      used.add(card.id);
    }
  }

  // 挑出炸弹点数，整组四张发给同一家
  const available = new Set(RANKS);
  const takeRank = (rank: number, seat: number): void => {
    for (const suit of SUITS) {
      const card = cardOf(suit, rank);
      hands[seat].push(card);
      used.add(card.id);
    }
    available.delete(rank);
  };
  const findRuns = (length: number): number[] => {
    const starts: number[] = [];
    for (let s = 3; s + length - 1 <= 14; s++) {
      let ok = true;
      for (let r = s; r < s + length; r++) {
        if (!available.has(r)) {
          ok = false;
          break;
        }
      }
      if (ok) starts.push(s);
    }
    return starts;
  };

  for (let i = 0; i < 3; i++) {
    let need = bombCounts[i];
    // 大概率让某家的炸弹点数相邻，形成 2 连炸 / 3 连炸
    if (need >= 2 && Math.random() < 0.7) {
      let runLen = need >= 3 && Math.random() < 0.3 ? 3 : 2;
      if (runLen > need) runLen = need;
      const starts = findRuns(runLen);
      if (starts.length > 0) {
        const start = starts[Math.floor(Math.random() * starts.length)];
        for (let r = start; r < start + runLen; r++) takeRank(r, i);
        need -= runLen;
      }
    }
    while (need > 0) {
      const pool = [...available];
      if (pool.length === 0) break;
      takeRank(pool[Math.floor(Math.random() * pool.length)], i);
      need--;
    }
  }

  // 剩余牌均匀补齐，既避免过多额外炸弹，又保证牌型整齐
  const filler = shuffle(createDeck().filter((card) => !used.has(card.id)));
  let fillIndex = 0;
  let round = 0;
  while (fillIndex < filler.length) {
    const seat = round % 3;
    if (hands[seat].length < 17) {
      hands[seat].push(filler[fillIndex++]);
    }
    round++;
    if (hands.every((hand) => hand.length >= 17)) break;
  }
  const bottom = filler.slice(fillIndex);

  return {
    hands: hands.map((h) => sortCards(h)),
    bottom: sortCards(bottom),
  };
}

export function dealCards(shuffleDeck = true): DealResult {
  return shuffleDeck ? dealClassic() : dealBombHeavy();
}
