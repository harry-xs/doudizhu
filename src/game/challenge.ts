import { CLEAR_TARGET } from "./rooms";

export type ClearReason = "target" | "bankrupt";

export function getClearReason(
  humanBalance: number,
  aiBankrupt: boolean,
): ClearReason | null {
  if (humanBalance >= CLEAR_TARGET) return "target";
  if (aiBankrupt) return "bankrupt";
  return null;
}
