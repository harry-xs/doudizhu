import type { Card, Suit } from "./types";

const SUITS: Suit[] = ["spade", "heart", "club", "diamond"];

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

export function dealCards(): DealResult {
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
