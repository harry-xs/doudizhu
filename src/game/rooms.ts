export interface Room {
  id: string;
  name: string;
  multiplier: number;
}

export const DEFAULT_BEANS = 10000;
export const BEAN_BASE = 100;

export const ROOMS: Room[] = [
  { id: "novice", name: "新手场", multiplier: 1 },
  { id: "standard", name: "进阶场", multiplier: 2 },
  { id: "expert", name: "高手场", multiplier: 5 },
  { id: "master", name: "大师场", multiplier: 10 },
];

export function getRoom(id: string | null | undefined): Room {
  return ROOMS.find((room) => room.id === id) ?? ROOMS[0];
}

export function formatBeans(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(rounded) < 10000) return rounded.toLocaleString("zh-CN");
  const wan = rounded / 10000;
  return `${wan.toFixed(2).replace(/\.?0+$/, "")}w`;
}
