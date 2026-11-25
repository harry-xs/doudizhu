import {
  settleBeans,
  settleBeansWithBankruptcy,
  springFactor,
} from "../src/game/settlement";
import { getClearReason } from "../src/game/challenge";
import {
  BEAN_BASE,
  CLEAR_TARGET,
  INITIAL_BEANS,
  ROOMS,
  formatBeans,
  formatDelta,
} from "../src/game/rooms";

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
check("landlord win stake", landlordWin.stake === 120);
check("landlord win landlord delta", landlordWin.deltas.p0 === 240);
check("landlord win farmer deltas", landlordWin.deltas.p1 === -120 && landlordWin.deltas.p2 === -120);
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
check("farmer win stake scales", farmerWin.stake === 960);
check("farmer win landlord delta", farmerWin.deltas.p0 === -1920);
check("farmer win farmer deltas", farmerWin.deltas.p1 === 960 && farmerWin.deltas.p2 === 960);
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
check("deep debt theoretical delta", deepDebt.deltas.p0 === -153600);
check("deep debt stake", deepDebt.stake === 76800);

check("format zero", formatBeans(0) === "0");
check("format plain", formatBeans(9999) === "9,999");
check("format ten thousand", formatBeans(10000) === "1万");
check("format fractional wan", formatBeans(10500) === "1.05万");
check("format trailing zero", formatBeans(12000) === "1.2万");
check("format negative wan", formatBeans(-10000) === "-1万");
check("format negative plain", formatBeans(-500) === "-500");
check("format yi", formatBeans(100000000) === "1亿");
check("format wan yi", formatBeans(1000000000000) === "1万亿");
check("format initial human", formatBeans(INITIAL_BEANS.p0) === "1万");
check("format initial ai 1", formatBeans(INITIAL_BEANS.p1) === "5120万");
check("format initial ai 2", formatBeans(INITIAL_BEANS.p2) === "4870万");

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
check("spring multiplies settlement", springSettle.stake === 6000);
check("spring landlord delta", springSettle.deltas.p0 === 12000);

const rich = { p0: 100000, p1: 100000, p2: 100000 };
const standardWin = settleBeansWithBankruptcy({
  balances: rich,
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: true,
  multiple: 1,
});
check("standard win deltas", standardWin.deltas.p0 === 240 && standardWin.deltas.p1 === -120 && standardWin.deltas.p2 === -120);
check("standard win balances", standardWin.balances.p0 === 100240 && standardWin.balances.p1 === 99880);
check("standard win no subsidies", Object.values(standardWin.subsidies).every((v) => v === 0));

const poorFarmer = settleBeansWithBankruptcy({
  balances: { p0: 100000, p1: 50, p2: 1000 },
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: true,
  multiple: 1,
});
check("winner gain capped by broke farmer", poorFarmer.deltas.p0 === 170);
check("broke farmer pays only balance", poorFarmer.deltas.p1 === -50);
check("broke farmer gets subsidy", poorFarmer.subsidies.p1 === 10000 && poorFarmer.balances.p1 === 10000);
check("solvent farmer pays full", poorFarmer.deltas.p2 === -120 && poorFarmer.balances.p2 === 880);

const richLandlordLoses = settleBeansWithBankruptcy({
  balances: rich,
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: false,
  multiple: 1,
});
check("farmer win deltas", richLandlordLoses.deltas.p0 === -240 && richLandlordLoses.deltas.p1 === 120);
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

const deferredSubsidy = settleBeansWithBankruptcy({
  balances: { p0: 100000, p1: 50, p2: 1000 },
  landlordUid: "p0",
  farmerUids: ["p1", "p2"],
  landlordWon: true,
  multiple: 1,
  deferSubsidy: true,
});
check("deferred subsidy keeps zero balance", deferredSubsidy.balances.p1 === 0);
check("deferred subsidy is still reported", deferredSubsidy.subsidies.p1 === 10000);
check("deferred subsidy does not reduce winner gain", deferredSubsidy.deltas.p0 === 170);

check("base stake is 120", BEAN_BASE === 120);
check("clear target is 100m", CLEAR_TARGET === 100000000);
check("initial human balance", INITIAL_BEANS.p0 === 10000);
check("initial ai balances", INITIAL_BEANS.p1 === 51200000 && INITIAL_BEANS.p2 === 48700000);
check("room multipliers", ROOMS.map((room) => room.multiplier).join(",") === "1,10,50,500");
check("room entry minimums", ROOMS.map((room) => room.minBeans).join(",") === "0,50000,250000,2500000");
check("format delta positive", formatDelta(800000) === "+$80万");
check("format delta negative", formatDelta(-800000) === "-$80万");
check("format delta zero", formatDelta(0) === "$0");
check("format delta yi", formatDelta(100000000) === "+$1亿");
check("format delta wan yi", formatDelta(1500000000000) === "+$1.5万亿");

check("clear by target", getClearReason(100000000, false) === "target");
check("clear by bankruptcy", getClearReason(1000, true) === "bankrupt");
check("target has priority", getClearReason(100000000, true) === "target");
check("no clear", getClearReason(1000, false) === null);

console.log(`passed: ${passed}, failed: ${failures.length}`);
if (failures.length > 0) {
  console.log(failures);
  process.exit(1);
}
