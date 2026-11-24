import {
  settleBeans,
  settleBeansWithBankruptcy,
  springFactor,
} from "../src/game/settlement";
import { ROOMS, formatBeans, formatDelta } from "../src/game/rooms";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (condition) passed++;
  else failures.push(name);
}

const farmers = ["p1", "p2"];

const landlordWin = settleBeans({
  landlordUid: "p0",
  farmerUids: farmers,
  landlordWon: true,
  multiple: 1,
});
check("landlord win stake", landlordWin.stake === 100);
check("landlord win landlord delta", landlordWin.deltas.p0 === 200);
check("landlord win farmer deltas", landlordWin.deltas.p1 === -100 && landlordWin.deltas.p2 === -100);
check(
  "landlord win is zero sum",
  Object.values(landlordWin.deltas).reduce((a, b) => a + b, 0) === 0,
);

const farmerWin = settleBeans({
  landlordUid: "p0",
  farmerUids: farmers,
  landlordWon: false,
  multiple: 8,
});
check("farmer win stake scales", farmerWin.stake === 800);
check("farmer win landlord delta", farmerWin.deltas.p0 === -1600);
check("farmer win farmer deltas", farmerWin.deltas.p1 === 800 && farmerWin.deltas.p2 === 800);
check(
  "farmer win is zero sum",
  Object.values(farmerWin.deltas).reduce((a, b) => a + b, 0) === 0,
);

const deepDebt = settleBeans({
  landlordUid: "p0",
  farmerUids: farmers,
  landlordWon: false,
  multiple: 640,
});
check("negative beans are allowed", deepDebt.deltas.p0 === -128000);
check("no clamping on large stake", deepDebt.stake === 64000);

check("format zero", formatBeans(0) === "0");
check("format plain", formatBeans(9999) === "9,999");
check("format ten thousand", formatBeans(10000) === "1w");
check("format fractional wan", formatBeans(10500) === "1.05w");
check("format trailing zero", formatBeans(12000) === "1.2w");
check("format negative wan", formatBeans(-10000) === "-1w");
check("format negative plain", formatBeans(-500) === "-500");

check(
  "spring when farmers never played",
  springFactor({
    landlordWon: true,
    landlordPlayCount: 3,
    farmerPlayCounts: [0, 0],
  }) === 5,
);
check(
  "no spring when a farmer played",
  springFactor({
    landlordWon: true,
    landlordPlayCount: 3,
    farmerPlayCounts: [0, 1],
  }) === 1,
);
check(
  "anti-spring when landlord played once",
  springFactor({
    landlordWon: false,
    landlordPlayCount: 1,
    farmerPlayCounts: [3, 2],
  }) === 5,
);
check(
  "no anti-spring when landlord played twice",
  springFactor({
    landlordWon: false,
    landlordPlayCount: 2,
    farmerPlayCounts: [3, 2],
  }) === 1,
);
check(
  "no anti-spring when landlord never played",
  springFactor({
    landlordWon: false,
    landlordPlayCount: 0,
    farmerPlayCounts: [3, 2],
  }) === 1,
);

const springSettle = settleBeans({
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: true,
  multiple: 10 * 5,
});
check("spring multiplies settlement", springSettle.stake === 5000);
check("spring landlord delta", springSettle.deltas.p0 === 10000);

const rich = { p0: 100000, p1: 100000, p2: 100000 };
const standardWin = settleBeansWithBankruptcy({
  balances: rich,
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: true,
  multiple: 1,
});
check("standard win deltas", standardWin.deltas.p0 === 200 && standardWin.deltas.p1 === -100 && standardWin.deltas.p2 === -100);
check("standard win balances", standardWin.balances.p0 === 100200 && standardWin.balances.p1 === 99900);
check("standard win no subsidies", Object.values(standardWin.subsidies).every((v) => v === 0));

const poorFarmer = settleBeansWithBankruptcy({
  balances: { p0: 100000, p1: 50, p2: 1000 },
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: true,
  multiple: 1,
});
check("winner gain capped by broke farmer", poorFarmer.deltas.p0 === 150);
check("broke farmer pays only balance", poorFarmer.deltas.p1 === -50);
check("broke farmer gets subsidy", poorFarmer.subsidies.p1 === 10000 && poorFarmer.balances.p1 === 10000);
check("solvent farmer pays full", poorFarmer.deltas.p2 === -100 && poorFarmer.balances.p2 === 900);

const richLandlordLoses = settleBeansWithBankruptcy({
  balances: rich,
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: false,
  multiple: 1,
});
check("farmer win deltas", richLandlordLoses.deltas.p0 === -200 && richLandlordLoses.deltas.p1 === 100);
check("farmer win no subsidies", Object.values(richLandlordLoses.subsidies).every((v) => v === 0));

const poorLandlord = settleBeansWithBankruptcy({
  balances: { p0: 150, p1: 1000, p2: 1000 },
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: false,
  multiple: 1,
});
check("broke landlord splits payment", poorLandlord.deltas.p1 === 75 && poorLandlord.deltas.p2 === 75);
check("broke landlord pays all", poorLandlord.deltas.p0 === -150);
check("broke landlord gets subsidy", poorLandlord.subsidies.p0 === 10000 && poorLandlord.balances.p0 === 10000);

const zeroLandlord = settleBeansWithBankruptcy({
  balances: { p0: 0, p1: 1000, p2: 1000 },
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: false,
  multiple: 1,
});
check("farmers get nothing from broke landlord", zeroLandlord.deltas.p1 === 0 && zeroLandlord.deltas.p2 === 0);
check("zero landlord gets subsidy", zeroLandlord.subsidies.p0 === 10000 && zeroLandlord.balances.p0 === 10000);
check("no negative balances", Object.values(zeroLandlord.balances).every((v) => v >= 0));
check("paid beans are conserved", Object.values(poorFarmer.deltas).reduce((a, b) => a + b, 0) === 0);

check("room multipliers", ROOMS.map((room) => room.multiplier).join(",") === "1,10,50,500");
check("room entry minimums", ROOMS.map((room) => room.minBeans).join(",") === "0,50000,250000,2500000");
check("format delta positive", formatDelta(800000) === "+$80w");
check("format delta negative", formatDelta(-800000) === "-$80w");
check("format delta zero", formatDelta(0) === "$0");

console.log(`passed: ${passed}, failed: ${failures.length}`);
if (failures.length > 0) {
  console.log(failures);
  process.exit(1);
}
