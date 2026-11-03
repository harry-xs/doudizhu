import type { Card, PlayInfo } from "../src/game/types";
import { dealCards, sortCards } from "../src/game/deck";
import { parsePlay, canBeat } from "../src/game/rules";
import {
  chooseMove as chooseMoveNew,
  type MoveContext,
} from "../src/game/ai";
import { chooseMoveBaseline } from "./baseline-ai";

type ChooseMove = (
  hand: Card[],
  last: PlayInfo | null,
  context: MoveContext,
) => ReturnType<typeof chooseMoveNew>;

interface Result {
  landlordWins: number;
  farmerWins: number;
  plays: number[];
  timeMs: number;
}

function playGame(
  landlordAI: ChooseMove,
  farmerAI: ChooseMove,
): { winner: number; plays: number[] } {
  const dealt = dealCards();
  const players = dealt.hands.map((hand, i) => ({
    hand: sortCards(hand),
    isLandlord: i === 0,
    uid: `p${i}`,
  }));
  players[0].hand = sortCards([...players[0].hand, ...dealt.bottom]);

  let turn = 0;
  let last: PlayInfo | null = null;
  let lastOwner: (typeof players)[number] | null = null;
  let passes = 0;
  const plays = [0, 0, 0];

  for (let step = 0; step < 500; step++) {
    const player = players[turn];
    const order = players.map((p) => ({
      uid: p.uid,
      isLandlord: p.isLandlord,
      handCount: p.hand.length,
    }));
    const context: MoveContext = {
      self: order[turn],
      players: order,
      lastPlayerUid: lastOwner?.uid ?? null,
      landlordUid: "p0",
    };
    const ai = player.isLandlord ? landlordAI : farmerAI;
    const move = ai(player.hand, last, context);

    if (move) {
      const info = parsePlay(move.cards);
      if (!info) throw new Error("AI produced invalid pattern");
      if (last && !canBeat(info, last)) {
        throw new Error("AI produced a move that cannot beat last");
      }
      const remove = new Set(move.cards.map((c) => c.id));
      player.hand = player.hand.filter((c) => !remove.has(c.id));
      last = info;
      lastOwner = player;
      passes = 0;
      plays[turn]++;
      if (player.hand.length === 0) {
        return { winner: player.isLandlord ? 0 : 1, plays };
      }
    } else {
      if (!last) throw new Error("leader passed");
      passes++;
      if (passes >= 2) {
        passes = 0;
        last = null;
        lastOwner = null;
      }
    }

    turn = (turn + 1) % 3;
  }

  throw new Error("game did not finish");
}

function run(landlordAI: ChooseMove, farmerAI: ChooseMove, games: number): Result {
  const start = Date.now();
  let landlordWins = 0;
  let farmerWins = 0;
  const plays = [0, 0, 0];
  for (let i = 0; i < games; i++) {
    const result = playGame(landlordAI, farmerAI);
    if (result.winner === 0) landlordWins++;
    else farmerWins++;
    for (let seat = 0; seat < 3; seat++) plays[seat] += result.plays[seat];
  }
  return {
    landlordWins,
    farmerWins,
    plays: plays.map((n) => n / games),
    timeMs: Date.now() - start,
  };
}

const games = Number(process.argv[2] ?? 600);

const scenarios: { name: string; landlord: ChooseMove; farmer: ChooseMove }[] = [
  { name: "new  vs new ", landlord: chooseMoveNew, farmer: chooseMoveNew },
  { name: "old  vs old ", landlord: chooseMoveBaseline, farmer: chooseMoveBaseline },
  { name: "new  vs old ", landlord: chooseMoveNew, farmer: chooseMoveBaseline },
  { name: "old  vs new ", landlord: chooseMoveBaseline, farmer: chooseMoveNew },
];

for (const scenario of scenarios) {
  const result = run(scenario.landlord, scenario.farmer, games);
  const landlordRate = ((result.landlordWins / games) * 100).toFixed(1);
  const farmerRate = ((result.farmerWins / games) * 100).toFixed(1);
  const secs = (result.timeMs / 1000).toFixed(1);
  const playText = result.plays.map((n) => n.toFixed(1)).join(" / ");
  console.log(
    `${scenario.name} 地主(${landlordRate}%)  农民(${farmerRate}%)  出牌次数 ${playText}  ${secs}s`,
  );
}
