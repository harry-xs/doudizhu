export interface Room {
  id: string;
  name: string;
  multiplier: number;
  minBeans: number;
}

export const INITIAL_BEANS: Record<string, number> = {
  p0: 10000,
  p1: 51200000,
  p2: 48700000,
};
export const CLEAR_TARGET = 100000000;
export const BEAN_BASE = 120;
export const BANKRUPT_SUBSIDY = 10000;

export const ROOMS: Room[] = [
  { id: "novice", name: "新手场", multiplier: 1, minBeans: 0 },
  { id: "standard", name: "进阶场", multiplier: 10, minBeans: 50000 },
  { id: "expert", name: "高手场", multiplier: 50, minBeans: 250000 },
  { id: "master", name: "大师场", multiplier: 500, minBeans: 2500000 },
];

const NO_SHUFFLE_MIN_BEANS: Record<string, number> = {
  novice: 0,
  standard: 1000000,
  expert: 10000000,
  master: 100000000,
};

export function getRooms(shuffle: boolean): Room[] {
  if (shuffle) return ROOMS;
  return ROOMS.map((room) => ({
    ...room,
    minBeans: NO_SHUFFLE_MIN_BEANS[room.id] ?? room.minBeans,
  }));
}

export function getRoom(
  id: string | null | undefined,
  shuffle = true,
): Room {
  return getRooms(shuffle).find((room) => room.id === id) ?? getRooms(shuffle)[0];
}

function compact(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatBeans(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  if (abs >= 1000000000000) {
    return `${compact(rounded / 1000000000000)}万亿`;
  }
  if (abs >= 100000000) {
    return `${compact(rounded / 100000000)}亿`;
  }
  if (abs >= 10000) {
    return `${compact(rounded / 10000)}万`;
  }
  return rounded.toLocaleString("zh-CN");
}

export function formatDelta(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "$0";
  if (rounded > 0) return `+$${formatBeans(rounded)}`;
  return `-$${formatBeans(Math.abs(rounded))}`;
}
