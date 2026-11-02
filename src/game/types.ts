export type Suit = "spade" | "heart" | "club" | "diamond" | "joker";

// 3..10 => 3..10, J=11, Q=12, K=13, A=14, 2=15, small joker=16, big joker=17
export type Rank = number;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  uid: string;
  name: string;
  hand: Card[];
  isLandlord: boolean;
  isRobot: boolean;
  isTrustee: boolean;
}

export type GamePhase = "idle" | "call" | "play" | "settle";

export interface GameState {
  phase: GamePhase;
  players: Player[];
  bottomCards: Card[];
  turnUid: string;
  lastPlay: Card[] | null;
  lastPlayerUid: string | null;
  multiple: number;
  winner: string[] | null;
}

export interface AppSetting {
  sound: boolean;
  animation: boolean;
}

export type CardType =
  | "single"
  | "pair"
  | "triple"
  | "tripleWithOne"
  | "tripleWithTwo"
  | "straight"
  | "doubleStraight"
  | "plane"
  | "planeWithOne"
  | "planeWithTwo"
  | "bomb"
  | "kingBomb";

export interface PlayInfo {
  type: CardType;
  rank: number;
  length: number;
}

export interface TableAction {
  kind: "play" | "pass";
  cards: Card[];
  info: PlayInfo | null;
}

export const TYPE_LABEL: Record<CardType, string> = {
  single: "单张",
  pair: "对子",
  triple: "三张",
  tripleWithOne: "三带一",
  tripleWithTwo: "三带对",
  straight: "顺子",
  doubleStraight: "连对",
  plane: "飞机",
  planeWithOne: "飞机带单",
  planeWithTwo: "飞机带对",
  bomb: "炸弹",
  kingBomb: "王炸",
};

export const RANK_LABEL: Record<number, string> = {
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
  15: "2",
  16: "小",
  17: "大",
};
