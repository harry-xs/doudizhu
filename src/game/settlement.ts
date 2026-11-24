import { BANKRUPT_SUBSIDY, BEAN_BASE } from "./rooms";

export interface SettlementInput {
  landlordUid: string;
  farmerUids: string[];
  landlordWon: boolean;
  multiple: number;
  base?: number;
}

export interface SettlementResult {
  stake: number;
  deltas: Record<string, number>;
}

export interface SpringInput {
  landlordWon: boolean;
  landlordPlayCount: number;
  farmerPlayCounts: number[];
}

export function springFactor(input: SpringInput): number {
  if (input.landlordWon) {
    return input.farmerPlayCounts.every((count) => count === 0) ? 5 : 1;
  }
  return input.landlordPlayCount === 1 ? 5 : 1;
}

export function settleBeans(input: SettlementInput): SettlementResult {
  const stake = (input.base ?? BEAN_BASE) * input.multiple;
  const deltas: Record<string, number> = {};
  const sign = input.landlordWon ? 1 : -1;
  deltas[input.landlordUid] = sign * stake * 2;
  for (const uid of input.farmerUids) {
    deltas[uid] = -sign * stake;
  }
  return { stake, deltas };
}

export interface BankruptcySettlementInput {
  balances: Record<string, number>;
  landlordUid: string;
  farmerUids: string[];
  landlordWon: boolean;
  multiple: number;
  base?: number;
  subsidy?: number;
}

export interface BankruptcySettlementResult {
  stake: number;
  deltas: Record<string, number>;
  subsidies: Record<string, number>;
  balances: Record<string, number>;
}

export function settleBeansWithBankruptcy(
  input: BankruptcySettlementInput,
): BankruptcySettlementResult {
  const stake = (input.base ?? BEAN_BASE) * input.multiple;
  const subsidy = input.subsidy ?? BANKRUPT_SUBSIDY;
  const uids = [input.landlordUid, ...input.farmerUids];
  const start: Record<string, number> = {};
  const deltas: Record<string, number> = {};
  for (const uid of uids) {
    start[uid] = Math.max(0, Math.floor(input.balances[uid] ?? 0));
    deltas[uid] = 0;
  }

  if (input.landlordWon) {
    let gain = 0;
    for (const uid of input.farmerUids) {
      const pay = Math.min(stake, start[uid]);
      deltas[uid] = -pay;
      gain += pay;
    }
    deltas[input.landlordUid] = gain;
  } else {
    const available = start[input.landlordUid];
    const owed = stake * input.farmerUids.length;
    if (available >= owed) {
      for (const uid of input.farmerUids) deltas[uid] = stake;
      deltas[input.landlordUid] = -owed;
    } else {
      let remaining = available;
      let assigned = 0;
      for (let i = 0; i < input.farmerUids.length; i++) {
        const slotsLeft = input.farmerUids.length - i;
        const share = Math.min(stake, Math.floor(remaining / slotsLeft));
        deltas[input.farmerUids[i]] = share;
        remaining -= share;
        assigned += share;
      }
      deltas[input.landlordUid] = -assigned;
    }
  }

  const subsidies: Record<string, number> = {};
  const balances: Record<string, number> = {};
  for (const uid of uids) {
    const after = Math.max(0, start[uid] + deltas[uid]);
    subsidies[uid] = after <= 0 ? subsidy : 0;
    balances[uid] = after + subsidies[uid];
  }

  return { stake, deltas, subsidies, balances };
}
