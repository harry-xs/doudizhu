import type { Card, Suit } from "../src/game/types";
import { buildCardCounter, COUNTER_RANKS, counterRankLabel } from "../src/game/counter";
import { dealCards } from "../src/game/deck";
import { canBeat, parsePlay } from "../src/game/rules";
import { chooseMove } from "../src/game/ai";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (condition) passed++;
  else failures.push(name);
}

function card(rank: number, suit: Suit = "spade"): Card {
  return { id: `${suit}-${rank}-${Math.random()}`, suit, rank };
}

const sum = (cards: Card[]): number => cards.length;

const empty = buildCardCounter([], []);
check("empty has 15 ranks", empty.length === COUNTER_RANKS.length);
check(
  "empty sums to 54",
  empty.reduce((acc, item) => acc + item.left, 0) === 54,
);
check(
  "empty normal ranks are 4",
  empty
    .filter((item) => item.rank < 16)
    .every((item) => item.left === 4),
);
check(
  "empty jokers are 1",
  empty
    .filter((item) => item.rank >= 16)
    .every((item) => item.left === 1),
);

check("rank labels", COUNTER_RANKS.map(counterRankLabel).join(",") ===
  "3,4,5,6,7,8,9,10,J,Q,K,A,2,小王,大王");

const hand = [card(3), card(3), card(15, "joker"), card(16, "joker")];
const withHand = buildCardCounter([], hand);
check(
  "own hand is excluded",
  withHand.find((i) => i.rank === 3)?.left === 2 &&
    withHand.find((i) => i.rank === 15)?.left === 3 &&
    withHand.find((i) => i.rank === 16)?.left === 0,
);

const played = [card(7), card(7), card(17, "joker")];
const withPlayed = buildCardCounter(played, []);
check(
  "played cards are excluded",
  withPlayed.find((i) => i.rank === 7)?.left === 2 &&
    withPlayed.find((i) => i.rank === 17)?.left === 0,
);

const both = buildCardCounter(played, hand);
check(
  "played and own hand combine",
  both.reduce((acc, item) => acc + item.left, 0) === 54 - 3 - 4,
);

const overflow = buildCardCounter(
  [card(9), card(9), card(9), card(9)],
  [card(9), card(9)],
);
check(
  "counts never go negative",
  overflow.every((item) => item.left >= 0) &&
    overflow.find((i) => i.rank === 9)?.left === 0,
);

function expectedCounts(playedCards: Card[], handCards: Card[]) {
  const counts: Record<number, number> = {};
  for (const rank of COUNTER_RANKS) counts[rank] = rank >= 16 ? 1 : 4;
  for (const c of [...playedCards, ...handCards]) {
    counts[c.rank] = Math.max(0, counts[c.rank] - 1);
  }
  return counts;
}

let simulated = 0;
let invariantHeld = true;
let exhaustionHeld = true;

for (let g = 0; g < 100; g++) {
  const dealt = dealCards();
  const hands = dealt.hands.map((h) => [...h]);
  hands[0] = [...hands[0], ...dealt.bottom];
  const players = hands.map((h, i) => ({ uid: `p${i}`, hand: h }));
  const played: Card[] = [];
  let last: ReturnType<typeof parsePlay> = null;
  let owner = -1;
  let turn = 0;
  let passes = 0;
  let winner = -1;

  for (let step = 0; step < 400 && winner < 0; step++) {
    const player = players[turn];
    const order = players.map((p, i) => ({
      uid: p.uid,
      isLandlord: i === 0,
      handCount: p.hand.length,
    }));
    const move = chooseMove(player.hand, last, {
      self: order[turn],
      players: order,
      lastPlayerUid: owner >= 0 ? players[owner].uid : null,
      landlordUid: "p0",
    });

    if (move) {
      const info = parsePlay(move.cards);
      if (!info) throw new Error(`invalid move in game ${g}`);
      if (last && !canBeat(info, last)) {
        throw new Error(`unbeatable move in game ${g}`);
      }
      const remove = new Set(move.cards.map((c) => c.id));
      player.hand = player.hand.filter((c) => !remove.has(c.id));
      played.push(...move.cards);
      last = info;
      owner = turn;
      passes = 0;
      if (player.hand.length === 0) winner = turn;
    } else {
      if (!last) throw new Error(`leader passed in game ${g}`);
      passes++;
      if (passes >= 2) {
        passes = 0;
        last = null;
        owner = -1;
      }
    }

    const items = buildCardCounter(played, players[0].hand);
    const itemsSum = items.reduce((acc, item) => acc + item.left, 0);
    const expected = expectedCounts(played, players[0].hand);
    if (itemsSum !== 54 - played.length - players[0].hand.length) {
      invariantHeld = false;
    }
    if (items.some((item) => item.left !== expected[item.rank])) {
      invariantHeld = false;
    }

    turn = (turn + 1) % 3;
  }

  if (winner < 0) throw new Error(`game ${g} did not finish`);

  const finalItems = buildCardCounter(played, players[0].hand);
  const finalSum = finalItems.reduce((acc, item) => acc + item.left, 0);
  if (finalSum !== sum(players[1].hand) + sum(players[2].hand)) {
    exhaustionHeld = false;
  }
  simulated++;
}

check("simulated 100 games", simulated === 100);
check("counter invariant holds during play", invariantHeld);
check("final counter equals opponents' remaining cards", exhaustionHeld);

console.log(`passed: ${passed}, failed: ${failures.length}`);
if (failures.length > 0) {
  console.log(failures);
  process.exit(1);
}
