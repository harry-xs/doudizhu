import { BEAN_BASE } from "./rooms";

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
