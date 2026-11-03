import type { Card, Suit } from "../src/game/types";
import { parsePlay, canBeat } from "../src/game/rules";
import { dealCards, sortCards } from "../src/game/deck";
import { chooseMove, chooseCall } from "../src/game/ai";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (condition) passed++;
  else failures.push(name);
}

function card(rank: number, suit: Suit = "spade"): Card {
  return { id: `${suit}-${rank}-${Math.random()}`, suit, rank };
}

function many(rank: number, n: number, suit: Suit = "spade"): Card[] {
  return Array.from({ length: n }, () => card(rank, suit));
}

function tl(cards: Card[]): string | null {
  return parsePlay(cards)?.type ?? null;
}

check("single", tl([card(3)]) === "single");
check("pair", tl(many(5, 2)) === "pair");
check("triple", tl(many(7, 3)) === "triple");
check("tripleWithOne", tl([...many(7, 3), card(3)]) === "tripleWithOne");
check("tripleWithTwo", tl([...many(7, 3), ...many(3, 2)]) === "tripleWithTwo");
check("bomb", tl(many(9, 4)) === "bomb");
check("kingBomb", tl([card(16, "joker"), card(17, "joker")]) === "kingBomb");
check("straight", tl([3, 4, 5, 6, 7].map((r) => card(r))) === "straight");
check("straight4 invalid", tl([3, 4, 5, 6].map((r) => card(r))) === null);
check("straight with 2 invalid", tl([11, 12, 13, 14, 15].map((r) => card(r))) === null);
check(
  "doubleStraight",
  tl([3, 3, 4, 4, 5, 5].map((r) => card(r))) === "doubleStraight",
);
check(
  "doubleStraight 2 invalid",
  tl([13, 13, 14, 14, 15, 15].map((r) => card(r))) === null,
);
check("plane", tl([...many(3, 3), ...many(4, 3)]) === "plane");
check(
  "plane with one pair as singles",
  tl([...many(3, 3), ...many(4, 3), ...many(5, 2)]) === "planeWithOne",
);
check(
  "plane with two pairs",
  tl([...many(3, 3), ...many(4, 3), ...many(5, 2), ...many(6, 2)]) ===
    "planeWithTwo",
);
check(
  "plane with one invalid length",
  tl([...many(3, 3), ...many(4, 3), card(5), card(6), card(7)]) === null,
);

const pair4 = parsePlay(many(4, 2))!;
const pair5 = parsePlay(many(5, 2))!;
const straightA = parsePlay([3, 4, 5, 6, 7, 8].map((r) => card(r)))!;
const straightB = parsePlay([4, 5, 6, 7, 8].map((r) => card(r)))!;
const bomb = parsePlay(many(9, 4))!;
const rocket = parsePlay([card(16, "joker"), card(17, "joker")])!;

check("pair beats lower pair", canBeat(pair5, pair4));
check("pair cannot beat same", !canBeat(pair4, pair4));
check("different length straight cannot beat", !canBeat(straightB, straightA));
check("bomb beats straight", canBeat(bomb, straightA));
check("rocket beats bomb", canBeat(rocket, bomb));
check("bomb cannot beat rocket", !canBeat(bomb, rocket));

let calls = 0;
for (let i = 0; i < 200; i++) {
  if (chooseCall(dealCards().hands[0])) calls++;
}
check("chooseCall returns boolean", calls >= 0 && calls <= 200);

let simulated = 0;
for (let g = 0; g < 600; g++) {
  const dealt = dealCards();
  const players = dealt.hands.map((hand, i) => ({
    hand: sortCards(hand),
    isLandlord: i === 0,
    uid: `p${i}`,
  }));
  const bottom = dealt.bottom;
  players[0].hand = sortCards([...players[0].hand, ...bottom]);

  let turn = 0;
  let last = null as ReturnType<typeof parsePlay>;
  let lastOwner: (typeof players)[number] | null = null;
  let passes = 0;
  let winner: number | null = null;

  for (let step = 0; step < 400 && winner === null; step++) {
    const player = players[turn];
    const order = players.map((p) => ({
      uid: p.uid,
      isLandlord: p.isLandlord,
      handCount: p.hand.length,
    }));
    const move = chooseMove(player.hand, last, {
      self: order[turn],
      players: order,
      lastPlayerUid: lastOwner?.uid ?? null,
      landlordUid: "p0",
    });

    if (move) {
      const ids = new Set(player.hand.map((c) => c.id));
      for (const c of move.cards) {
        if (!ids.has(c.id)) throw new Error(`move uses card not in hand (game ${g})`);
      }
      const info = parsePlay(move.cards);
      if (!info) throw new Error(`AI produced invalid pattern (game ${g})`);
      if (last && !canBeat(info, last)) {
        throw new Error(`AI produced move that cannot beat last (game ${g})`);
      }
      const remove = new Set(move.cards.map((c) => c.id));
      player.hand = player.hand.filter((c) => !remove.has(c.id));
      last = info;
      lastOwner = player;
      passes = 0;
      if (player.hand.length === 0) winner = turn;
    } else {
      if (!last) throw new Error(`leader produced no move (game ${g})`);
      passes++;
      if (passes >= 2) {
        passes = 0;
        last = null;
        lastOwner = null;
      }
    }

    turn = (turn + 1) % 3;
  }

  if (winner === null) throw new Error(`game ${g} did not finish`);
  simulated++;
}

check("simulated 600 games", simulated === 600);

console.log(`passed: ${passed}, failed: ${failures.length}`);
if (failures.length > 0) {
  console.log(failures);
  process.exit(1);
}
