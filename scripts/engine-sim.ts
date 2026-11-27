import type { Card, Suit } from "../src/game/types";
import {
  parsePlay,
  canBeat,
  setBombStraightEnabled,
} from "../src/game/rules";
import { dealCards, sortCards } from "../src/game/deck";
import {
  chooseBombOverride,
  chooseMove,
  chooseCall,
  suggestMoves,
} from "../src/game/ai";
import { generateAllMoves, generateBeatingMoves } from "../src/game/moves";

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
const quadWingPlane = parsePlay([
  ...many(3, 3),
  ...many(4, 4),
  card(5),
])!;
check(
  "plane with quad leftover wing 33344445",
  quadWingPlane.type === "planeWithOne" && quadWingPlane.rank === 4,
);
const longQuadWingPlane = parsePlay([
  ...many(5, 4),
  ...many(6, 3),
  ...many(7, 3),
  card(8),
  card(9),
])!;
check(
  "plane with quad leftover wing 555566677789",
  longQuadWingPlane.type === "planeWithOne" && longQuadWingPlane.rank === 7,
);
check(
  "AI generates plane with quad leftover wing",
  generateAllMoves([
    ...many(3, 3),
    ...many(4, 4),
    card(5),
  ]).some((move) => move.info.type === "planeWithOne" && move.info.rank === 4),
);
check(
  "fourWithTwo",
  tl([...many(8, 4), card(4), card(5)]) === "fourWithTwo",
);
check(
  "fourWithTwo with pair kickers",
  tl([...many(8, 4), ...many(4, 2)]) === "fourWithTwo",
);
check(
  "fourWithTwoPairs",
  tl([...many(8, 4), ...many(4, 2), ...many(5, 2)]) === "fourWithTwoPairs",
);
check(
  "fourWithTwo seven cards invalid",
  tl([...many(8, 4), card(4), card(5), card(6)]) === null,
);
check(
  "fourWithTwoPairs odd kickers invalid",
  tl([...many(8, 4), ...many(4, 2), card(5), card(6)]) === null,
);

setBombStraightEnabled(true);
const chain2 = parsePlay([...many(3, 4), ...many(4, 4)])!;
check(
  "bombStraight parse",
  chain2.type === "bombStraight" && chain2.length === 8 && chain2.rank === 4,
);
const chain3 = parsePlay([...many(3, 4), ...many(4, 4), ...many(5, 4)])!;
check(
  "bombStraight three in a row",
  chain3.type === "bombStraight" && chain3.length === 12,
);
check(
  "bombStraight excludes 2",
  parsePlay([...many(14, 4), ...many(15, 4)]) === null,
);
check(
  "bombStraight not consecutive",
  parsePlay([...many(3, 4), ...many(5, 4)]) === null,
);
const chain45 = parsePlay([...many(4, 4), ...many(5, 4)])!;
const chainMoves = generateBeatingMoves(
  [...many(3, 4), ...many(4, 4), card(9)],
  parsePlay(many(9, 4))!,
);
check(
  "AI generates bombStraight",
  chainMoves.some((move) => move.info.type === "bombStraight"),
);
setBombStraightEnabled(false);
check(
  "bombStraight disabled in classic mode",
  parsePlay([...many(3, 4), ...many(4, 4)]) === null,
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
check("bombStraight beats rocket", canBeat(chain2, rocket));
check("rocket cannot beat bombStraight", !canBeat(rocket, chain2));
check("longer bombStraight beats shorter", canBeat(chain3, chain2));
check("shorter bombStraight cannot beat longer", !canBeat(chain2, chain3));
check("same length bombStraight compares rank", canBeat(chain45, chain2));
check("lower bombStraight cannot beat higher", !canBeat(chain2, chain45));

const fourWithTwo3 = parsePlay([...many(3, 4), card(4), card(5)])!;
const fourWithTwo9 = parsePlay([...many(9, 4), card(4), card(5)])!;
const fourWithTwoPairs3 = parsePlay([
  ...many(3, 4),
  ...many(4, 2),
  ...many(5, 2),
])!;

check("higher fourWithTwo beats lower", canBeat(fourWithTwo9, fourWithTwo3));
check(
  "fourWithTwo cannot beat fourWithTwoPairs",
  !canBeat(fourWithTwo9, fourWithTwoPairs3),
);
check("bomb beats fourWithTwo", canBeat(bomb, fourWithTwo9));

const fourWithTwoMoves = generateBeatingMoves(
  [...many(9, 4), card(3), card(4), ...many(10, 2)],
  fourWithTwo3,
);
check(
  "AI generates fourWithTwo",
  fourWithTwoMoves.some(
    (move) => move.info.type === "fourWithTwo" && move.info.rank === 9,
  ),
);

const fourWithTwoPairsMoves = generateBeatingMoves(
  [...many(9, 4), ...many(6, 2), ...many(7, 2), card(8)],
  fourWithTwoPairs3,
);
check(
  "AI generates fourWithTwoPairs",
  fourWithTwoPairsMoves.some(
    (move) => move.info.type === "fourWithTwoPairs" && move.info.rank === 9,
  ),
);

const bombHand = [...many(5, 4), card(9)];
const single4 = parsePlay([card(4)])!;
const bombBeating = generateBeatingMoves(bombHand, single4);
check(
  "beating move does not split bomb",
  !bombBeating.some(
    (move) =>
      move.info.type !== "bomb" &&
      move.cards.some((card) => card.rank === 5),
  ),
);
check(
  "beating move still offers bomb",
  bombBeating.some((move) => move.info.type === "bomb"),
);
const bombLead = generateAllMoves(bombHand);
check(
  "lead moves do not split bomb",
  !bombLead.some((move) => {
    if (move.info.type === "bomb") return false;
    const used = move.cards.filter((card) => card.rank === 5).length;
    return used > 0 && used < 4;
  }),
);
const rocketHand = [card(16, "joker"), card(17, "joker"), card(9)];
const rocketBeating = generateBeatingMoves(rocketHand, single4);
check(
  "beating move does not split rocket",
  !rocketBeating.some(
    (move) => move.info.type === "single" && move.cards[0].rank >= 16,
  ),
);
check(
  "beating move still offers king bomb",
  rocketBeating.some((move) => move.info.type === "kingBomb"),
);

const bombHeavyHand = [
  ...many(5, 4),
  ...many(6, 4),
  ...many(7, 4),
  ...many(8, 4),
];
const tripleWithOneLast = parsePlay([...many(3, 3), card(9)])!;
const bombCtx = {
  self: {
    uid: "p2",
    isLandlord: false,
    handCount: bombHeavyHand.length,
  },
  players: [
    { uid: "p0", isLandlord: true, handCount: 12 },
    { uid: "p1", isLandlord: false, handCount: 9 },
    { uid: "p2", isLandlord: false, handCount: bombHeavyHand.length },
  ],
  lastPlayerUid: "p0",
  landlordUid: "p0",
  playedCards: [] as Card[],
};
setBombStraightEnabled(true);
const aggressiveBomb = chooseMove(
  bombHeavyHand,
  tripleWithOneLast,
  bombCtx,
);
check(
  "bomb-heavy mode AI bombs instead of passing",
  !!aggressiveBomb &&
    (aggressiveBomb.info.type === "bomb" ||
      aggressiveBomb.info.type === "bombStraight" ||
      aggressiveBomb.info.type === "kingBomb"),
);
const bombOverride = chooseBombOverride(
  bombHeavyHand,
  tripleWithOneLast,
  bombCtx,
);
check(
  "bomb override triggers in no-shuffle mode",
  !!bombOverride &&
    (bombOverride.info.type === "bomb" ||
      bombOverride.info.type === "bombStraight" ||
      bombOverride.info.type === "kingBomb"),
);
const hintHand = [...many(4, 4), ...many(8, 4), ...many(9, 4)];
const hintBombs = suggestMoves(
  hintHand,
  parsePlay(many(3, 4))!,
  bombCtx,
);
check(
  "hint prefers the smallest bomb over a bigger bombStraight",
  hintBombs[0]?.info.type === "bomb" && hintBombs[0]?.info.rank === 4,
);
setBombStraightEnabled(false);
check(
  "classic mode still conserves bombs",
  chooseMove(bombHeavyHand, tripleWithOneLast, bombCtx) === null,
);
check(
  "bomb override disabled in classic mode",
  chooseBombOverride(bombHeavyHand, tripleWithOneLast, bombCtx) === null,
);

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
