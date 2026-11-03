import type { Card, PlayInfo } from "./types";
import { generateAllMoves, generateBeatingMoves, type Move } from "./moves";

export interface AIPlayerInfo {
  uid: string;
  isLandlord: boolean;
  handCount: number;
}

export interface MoveContext {
  self: AIPlayerInfo;
  players: AIPlayerInfo[];
  lastPlayerUid: string | null;
  landlordUid: string;
}

export interface HandEstimate {
  hands: number;
  control: number;
  bombs: number;
  rocket: boolean;
  topRank: number;
  highCards: number;
}

interface SeatContext {
  self: AIPlayerInfo;
  isFarmer: boolean;
  next: AIPlayerInfo;
  prev: AIPlayerInfo;
  landlord: AIPlayerInfo;
  teammate: AIPlayerInfo | null;
  lastPlayer: AIPlayerInfo | null;
  lastIsTeammate: boolean;
  opponents: AIPlayerInfo[];
  minOpponentCount: number;
}

function countsOf(cards: Card[]): number[] {
  const counts = new Array<number>(18).fill(0);
  for (const card of cards) counts[card.rank]++;
  return counts;
}

/**
 * 估算一手牌最少需要多少“手”才能打完，并统计控制牌数量。
 * 思路参考了常见权重/拆牌 AI：先拆火箭、炸弹、飞机、连对、顺子，
 * 再把三张与剩余单张/对子组合成三带一/三带对，最后单张、对子各算一手。
 */
export function estimateHand(cards: Card[]): HandEstimate {
  if (cards.length === 0) {
    return {
      hands: 0,
      control: 0,
      bombs: 0,
      rocket: false,
      topRank: 0,
      highCards: 0,
    };
  }

  const counts = countsOf(cards);
  let hands = 0;
  let bombs = 0;
  let rocket = false;
  let wingSlots = 0;

  let control = counts[15] + counts[16] + counts[17];
  let topRank = 3;
  let highCards = 0;
  for (let rank = 3; rank <= 17; rank++) {
    if (counts[rank] > 0) topRank = rank;
    if (rank >= 14) highCards += counts[rank];
  }

  if (counts[16] > 0 && counts[17] > 0) {
    rocket = true;
    hands++;
    control += 2;
    counts[16] = 0;
    counts[17] = 0;
  }

  for (let rank = 3; rank <= 15; rank++) {
    if (counts[rank] === 4) {
      bombs++;
      hands++;
      control += 2;
      counts[rank] = 0;
    }
  }

  // 飞机（连续三张，至少 2 组）
  let rank = 3;
  while (rank <= 14) {
    if (counts[rank] >= 3) {
      let end = rank;
      while (end + 1 <= 14 && counts[end + 1] >= 3) end++;
      const length = end - rank + 1;
      if (length >= 2) {
        for (let r = rank; r <= end; r++) counts[r] -= 3;
        hands++;
        wingSlots += length;
      }
      rank = end + 1;
    } else {
      rank++;
    }
  }

  // 连对（至少 3 组）
  let changed = true;
  while (changed) {
    changed = false;
    rank = 3;
    while (rank <= 14) {
      if (counts[rank] >= 2) {
        let end = rank;
        while (end + 1 <= 14 && counts[end + 1] >= 2) end++;
        if (end - rank + 1 >= 3) {
          for (let r = rank; r <= end; r++) counts[r] -= 2;
          hands++;
          changed = true;
        }
        rank = end + 1;
      } else {
        rank++;
      }
    }
  }

  // 顺子（至少 5 张）
  changed = true;
  while (changed) {
    changed = false;
    rank = 3;
    while (rank <= 14) {
      if (counts[rank] >= 1) {
        let end = rank;
        while (end + 1 <= 14 && counts[end + 1] >= 1) end++;
        if (end - rank + 1 >= 5) {
          for (let r = rank; r <= end; r++) counts[r] -= 1;
          hands++;
          changed = true;
        }
        rank = end + 1;
      } else {
        rank++;
      }
    }
  }

  // 剩余三张
  for (let r = 3; r <= 15; r++) {
    while (counts[r] >= 3) {
      hands++;
      wingSlots++;
      counts[r] -= 3;
    }
  }

  // 剩余对子、单张
  let pairGroups = 0;
  let singleGroups = 0;
  for (let r = 3; r <= 17; r++) {
    if (counts[r] >= 2) {
      pairGroups += Math.floor(counts[r] / 2);
      counts[r] %= 2;
    }
    if (counts[r] === 1) singleGroups++;
  }
  hands += pairGroups + singleGroups;

  // 三带 / 飞机带翅膀可以减少手数
  hands -= Math.min(wingSlots, pairGroups + singleGroups);

  return { hands, control, bombs, rocket, topRank, highCards };
}

function isBombMove(move: Move): boolean {
  return move.info.type === "bomb" || move.info.type === "kingBomb";
}

function removeMoveCards(hand: Card[], move: Move): Card[] {
  const ids = new Set(move.cards.map((c) => c.id));
  return hand.filter((c) => !ids.has(c.id));
}

function usedControlCost(move: Move): number {
  if (isBombMove(move)) return 0;
  let cost = 0;
  for (const card of move.cards) {
    if (card.rank === 17 || card.rank === 16) cost += 10;
    else if (card.rank === 15) cost += 5;
    else if (card.rank === 14) cost += 1.5;
  }
  return cost;
}

function bombBreakPenalty(hand: Card[], move: Move): number {
  if (isBombMove(move)) return 0;
  const before = countsOf(hand);
  const used = countsOf(move.cards);
  let penalty = 0;
  for (let rank = 3; rank <= 15; rank++) {
    if (before[rank] === 4 && used[rank] > 0 && used[rank] < 4) {
      penalty += 80;
    }
  }
  if (before[16] > 0 && before[17] > 0 && (used[16] > 0 || used[17] > 0)) {
    penalty += 60;
  }
  return penalty;
}

function baseScore(hand: Card[], move: Move): number {
  const remaining = removeMoveCards(hand, move);
  if (remaining.length === 0) return -1e9;

  const est = estimateHand(remaining);
  let score = est.hands * 100;
  score -= est.control * 4;
  score += move.info.rank * 1.2;
  score -= move.cards.length * 0.4;
  score += usedControlCost(move);
  score += bombBreakPenalty(hand, move);
  if (isBombMove(move)) score += 260;
  return score;
}

function analyzeContext(context: MoveContext): SeatContext {
  const order = context.players;
  const selfIndex = order.findIndex((p) => p.uid === context.self.uid);
  const safeIndex = selfIndex < 0 ? 0 : selfIndex;
  const self = order[safeIndex] ?? context.self;
  const next = order[(safeIndex + 1) % order.length] ?? self;
  const prev =
    order[(safeIndex + order.length - 1) % order.length] ?? self;
  const landlord =
    order.find((p) => p.isLandlord) ??
    order.find((p) => p.uid === context.landlordUid) ??
    self;
  const isFarmer = !self.isLandlord;
  const teammate = isFarmer
    ? (order.find((p) => !p.isLandlord && p.uid !== self.uid) ?? null)
    : null;
  const lastPlayer = context.lastPlayerUid
    ? (order.find((p) => p.uid === context.lastPlayerUid) ?? null)
    : null;
  const lastIsTeammate =
    !!lastPlayer && !!teammate && lastPlayer.uid === teammate.uid;
  const opponents = isFarmer
    ? [landlord]
    : order.filter((p) => !p.isLandlord);
  const minOpponentCount = opponents.length
    ? Math.min(...opponents.map((p) => p.handCount))
    : 99;

  return {
    self,
    isFarmer,
    next,
    prev,
    landlord,
    teammate,
    lastPlayer,
    lastIsTeammate,
    opponents,
    minOpponentCount,
  };
}

function pickBest(
  moves: Move[],
  scoreFn: (move: Move) => number,
): Move {
  let best = moves[0];
  let bestScore = Infinity;
  for (const move of moves) {
    const score = scoreFn(move);
    if (score < bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

function leadScore(hand: Card[], move: Move, ctx: SeatContext): number {
  let score = baseScore(hand, move);
  const type = move.info.type;
  const isSingle = type === "single";
  const isPair = type === "pair";

  if (isBombMove(move)) score += 1000;

  // 对手只剩一张时，尽量避免出单张；如果只能出单张，优先出最大的
  if (ctx.minOpponentCount === 1) {
    if (isSingle) {
      score = 10000 - move.info.rank * 60;
    }
  } else if (ctx.minOpponentCount === 2 && isPair) {
    // 对手只剩两张时，尽量别送对子
    score = 10000 - move.info.rank * 40;
  }

  // 下家是只剩一张的队友：发一张最小的单牌让他走
  if (ctx.teammate && ctx.next.uid === ctx.teammate.uid) {
    if (ctx.teammate.handCount === 1) {
      if (isSingle) {
        score = move.info.rank * 10;
      } else {
        score += 300;
      }
    } else if (ctx.teammate.handCount <= 3) {
      if (isSingle || isPair) score -= 15;
      score += move.info.rank * 1.5;
    }
  }

  // 农民：下家是地主时做好守门，不轻易送小单/小对
  if (ctx.isFarmer && ctx.next.uid === ctx.landlord.uid) {
    if ((isSingle || isPair) && move.info.rank <= 11) {
      score += (12 - move.info.rank) * 8;
    }
  }

  return score;
}

export function chooseMove(
  hand: Card[],
  last: PlayInfo | null,
  context: MoveContext,
): Move | null {
  const ctx = analyzeContext(context);

  if (last) {
    const moves = generateBeatingMoves(hand, last);
    if (moves.length === 0) return null;

    const finishers = moves.filter((m) => m.cards.length === hand.length);
    if (finishers.length > 0) {
      return pickBest(finishers, (move) => baseScore(hand, move));
    }

    if (ctx.lastIsTeammate) {
      const normal = moves.filter((m) => !isBombMove(m));
      const remainingEstimate = estimateHand(hand);

      // 队友只剩一张：尽量让他走，除非自己能直接出完（上面已处理）
      if (ctx.teammate && ctx.teammate.handCount <= 1) return null;

      // 地主只剩一张：必须尽量用最大的牌顶住，哪怕顶队友
      if (ctx.minOpponentCount === 1) {
        if (normal.length > 0) {
          return pickBest(
            normal,
            (move) => -move.info.rank * 100 + baseScore(hand, move) * 0.05,
          );
        }
        const bombs = moves.filter((m) => isBombMove(m));
        if (bombs.length > 0) {
          return pickBest(bombs, (move) => baseScore(hand, move));
        }
        return null;
      }

      // 队友只剩两张：一般不抢，保留他出完的机会
      if (ctx.teammate && ctx.teammate.handCount <= 2) return null;

      if (normal.length === 0) return null;

      // 参考开源规则：队友出单张/对子时，用较小的牌接过来，让两个农民都参与出牌。
      // 但接牌不能让剩余手牌变得更零散（手数不能增加），避免为抢而拆坏结构。
      const keepsStructure = (move: Move): boolean =>
        estimateHand(removeMoveCards(hand, move)).hands <=
        remainingEstimate.hands;

      if (last.type === "single") {
        const lows = normal.filter(
          (m) =>
            m.info.type === "single" &&
            m.info.rank < 15 &&
            bombBreakPenalty(hand, m) === 0 &&
            keepsStructure(m),
        );
        if (lows.length > 0) {
          return pickBest(lows, (move) => baseScore(hand, move));
        }
      } else if (last.type === "pair") {
        const lows = normal.filter(
          (m) =>
            m.info.type === "pair" &&
            m.info.rank < 14 &&
            bombBreakPenalty(hand, m) === 0 &&
            keepsStructure(m),
        );
        if (lows.length > 0) {
          return pickBest(lows, (move) => baseScore(hand, move));
        }
      }

      // 接了这手牌后自己只剩一手，可以接管，准备下一轮走完
      const nearWin = normal.filter(
        (m) => estimateHand(removeMoveCards(hand, m)).hands <= 1,
      );
      if (nearWin.length > 0) {
        return pickBest(nearWin, (move) => baseScore(hand, move));
      }

      // 地主快走完且自己牌也很整，争夺主动权
      if (ctx.landlord.handCount <= 2 && remainingEstimate.hands <= 2) {
        return pickBest(normal, (move) => baseScore(hand, move));
      }

      return null;
    }

    const normal = moves.filter((m) => !isBombMove(m));
    const bombs = moves.filter((m) => isBombMove(m));
    const lastCount = ctx.lastPlayer?.handCount ?? 99;
    const emergency =
      lastCount <= 2 || ctx.minOpponentCount <= 2 || hand.length <= 4;

    if (normal.length > 0) {
      if (ctx.minOpponentCount === 1) {
        // 对手只剩一张时，用最大的牌顶住，降低被反压的概率
        return pickBest(
          normal,
          (move) => -move.info.rank * 100 + baseScore(hand, move) * 0.05,
        );
      }
      return pickBest(normal, (move) => {
        let score = baseScore(hand, move);
        if (emergency) {
          // 危险局面下优先出牌阻止对手，不再额外惩罚拆牌
          score -= bombBreakPenalty(hand, move) * 0.6;
        }
        return score;
      });
    }

    if (bombs.length === 0) return null;

    const remainingEstimate = estimateHand(hand);
    const shouldBomb =
      emergency ||
      remainingEstimate.hands <= 2 ||
      (!ctx.isFarmer && ctx.minOpponentCount <= 3) ||
      (ctx.isFarmer && ctx.landlord.handCount <= 3);

    if (!shouldBomb) return null;

    return pickBest(bombs, (move) => baseScore(hand, move));
  }

  const moves = generateAllMoves(hand);
  if (moves.length === 0) return null;

  const finisher =
    moves.find((m) => m.cards.length === hand.length && !isBombMove(m)) ??
    moves.find((m) => m.cards.length === hand.length);
  if (finisher) return finisher;

  const normal = moves.filter((m) => !isBombMove(m));
  const pool = normal.length > 0 ? normal : moves;

  // 下家是只剩一张牌的队友：优先拆出最小单张让他走
  if (
    ctx.teammate &&
    ctx.next.uid === ctx.teammate.uid &&
    ctx.teammate.handCount === 1
  ) {
    const counts = countsOf(hand);
    const singles = pool.filter(
      (m) =>
        m.info.type === "single" &&
        counts[m.cards[0].rank] < 4 &&
        m.cards[0].rank < 16,
    );
    if (singles.length > 0) {
      singles.sort((a, b) => a.info.rank - b.info.rank);
      return singles[0];
    }
  }

  return pickBest(pool, (move) => leadScore(hand, move, ctx));
}

/**
 * 返回当前局面下按推荐程度排序的候选出牌，供“提示”按钮循环使用。
 * 非炸弹牌型优先，炸弹/王炸放在最后。
 */
export function suggestMoves(
  hand: Card[],
  last: PlayInfo | null,
  context: MoveContext,
): Move[] {
  const ctx = analyzeContext(context);

  if (last) {
    const moves = generateBeatingMoves(hand, last);
    const normal = moves.filter((m) => !isBombMove(m));
    const bombs = moves.filter((m) => isBombMove(m));
    normal.sort((a, b) => baseScore(hand, a) - baseScore(hand, b));
    bombs.sort((a, b) => baseScore(hand, a) - baseScore(hand, b));
    return [...normal, ...bombs];
  }

  const moves = generateAllMoves(hand);
  const normal = moves.filter((m) => !isBombMove(m));
  const bombs = moves.filter((m) => isBombMove(m));
  normal.sort((a, b) => leadScore(hand, a, ctx) - leadScore(hand, b, ctx));
  bombs.sort((a, b) => leadScore(hand, a, ctx) - leadScore(hand, b, ctx));
  return [...normal, ...bombs];
}

/**
 * 叫地主评估。pressure 表示前面已经有几个人不叫，
 * 作为最后一家时会适当降低门槛，避免三家都不叫导致重新发牌。
 */
export function chooseCall(hand: Card[], pressure = 0): boolean {
  const est = estimateHand(hand);
  const base =
    (9 - est.hands) * 0.9 +
    est.control * 0.8 +
    est.bombs * 1.2 +
    (est.rocket ? 1.5 : 0) +
    est.topRank * 0.15 +
    Math.random() * 3;

  const threshold = pressure >= 2 ? 5.0 : 6.3;
  return base >= threshold;
}
