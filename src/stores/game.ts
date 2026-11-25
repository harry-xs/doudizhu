import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Card, GamePhase, PlayInfo, Player, TableAction } from "@/game/types";
import { playTypeLabel } from "@/game/types";
import { dealCards, sortCards } from "@/game/deck";
import { canBeat, parsePlay, setBombStraightEnabled } from "@/game/rules";
import { chooseCall, chooseMove, suggestMoves, type AIPlayerInfo, type MoveContext } from "@/game/ai";
import { chooseDouZeroMove, preloadDouZero } from "@/game/douzero";
import type { Move } from "@/game/moves";
import { playSound } from "@/game/sound";
import { getRoom, ROOMS, type Room } from "@/game/rooms";
import { settleBeansWithBankruptcy, springFactor } from "@/game/settlement";
import type { ClearReason } from "@/game/challenge";
import { useSettingsStore } from "./settings";
import { useWalletStore } from "./wallet";
import { useChallengeStore } from "./challenge";

const AI_NAMES = ["电脑小美", "电脑老王"];
const DECISION_HOLD = 1200;

function createPlayers(): Player[] {
  return [
    {
      uid: "p0",
      name: "我",
      hand: [],
      isLandlord: false,
      isRobot: false,
      isTrustee: false,
    },
    {
      uid: "p1",
      name: AI_NAMES[0],
      hand: [],
      isLandlord: false,
      isRobot: true,
      isTrustee: false,
    },
    {
      uid: "p2",
      name: AI_NAMES[1],
      hand: [],
      isLandlord: false,
      isRobot: true,
      isTrustee: false,
    },
  ];
}

export const useGameStore = defineStore("game", () => {
  const settings = useSettingsStore();
  const wallet = useWalletStore();
  const challenge = useChallengeStore();

  const phase = ref<GamePhase>("idle");
  const players = ref<Player[]>(createPlayers());
  const bottomCards = ref<Card[]>([]);
  const turnUid = ref("");
  const lastPlay = ref<Card[] | null>(null);
  const lastPlayerUid = ref<string | null>(null);
  const multiple = ref(1);
  const winner = ref<string[] | null>(null);
  const selectedIds = ref<string[]>([]);
  const message = ref("");
  const callActed = ref(0);
  const passCount = ref(0);
  const round = ref(0);
  const winnerSide = ref<"landlord" | "farmer" | null>(null);
  const tableActions = ref<Record<string, TableAction>>({});
  const tableDecisions = ref<Record<string, string>>({});
  const resultReady = ref(false);
  const resultDismissed = ref(false);
  const springBanner = ref<"spring" | "anti" | null>(null);
  const playedCards = ref<Card[]>([]);
  const playCounts = ref<Record<string, number>>({});
  const actionSeq = ref<Card[][]>([]);
  const playedBySeat = ref<Record<string, Card[]>>({});
  const lastMoveBySeat = ref<Record<string, Card[]>>({});
  const room = ref<Room>(ROOMS[0]);
  const beanDeltas = ref<Record<string, number>>({});
  const tentativeLandlordUid = ref<string | null>(null);
  const robQueue = ref<string[]>([]);
  const robIndex = ref(0);
  const robHappened = ref(false);
  const doubleActed = ref(0);
  const decisionLocked = ref(false);
  const bombBanner = ref<{
    kind: "bombStraight" | "kingBomb";
    length: number;
  } | null>(null);

  let gameToken = 0;
  let aiTimer: ReturnType<typeof setTimeout> | null = null;
  let fxTimer: ReturnType<typeof setTimeout> | null = null;
  let hintKey = "";
  let hintIndex = 0;
  let hintMoves: Move[] = [];

  function resetHint(): void {
    hintKey = "";
    hintIndex = 0;
    hintMoves = [];
  }

  const human = computed(() => players.value[0]);
  const currentPlayer = computed(
    () => players.value.find((p) => p.uid === turnUid.value) ?? null,
  );
  const landlord = computed(
    () => players.value.find((p) => p.isLandlord) ?? null,
  );
  const landlordConfirmed = computed(() => landlord.value !== null);
  const isHumanRobTurn = computed(
    () =>
      !decisionLocked.value &&
      phase.value === "rob" &&
      turnUid.value === human.value.uid,
  );
  const isHumanDoubleTurn = computed(
    () =>
      !decisionLocked.value &&
      phase.value === "double" &&
      turnUid.value === human.value.uid,
  );
  const lastPlayInfo = computed<PlayInfo | null>(() =>
    lastPlay.value ? parsePlay(lastPlay.value) : null,
  );
  const lastPlayer = computed(
    () => players.value.find((p) => p.uid === lastPlayerUid.value) ?? null,
  );
  const isHumanTurn = computed(
    () => phase.value === "play" && turnUid.value === human.value.uid,
  );
  const humanAuto = computed(
    () => human.value.isTrustee && phase.value === "play",
  );
  const selectedCards = computed(() =>
    human.value.hand.filter((c) => selectedIds.value.includes(c.id)),
  );
  const canPass = computed(
    () =>
      phase.value === "play" &&
      isHumanTurn.value &&
      !!lastPlay.value &&
      lastPlayerUid.value !== human.value.uid,
  );
  const humanIsWinner = computed(() => {
    if (!winner.value) return false;
    return winner.value.includes(human.value.uid);
  });
  const bottomRevealed = computed(
    () => landlordConfirmed.value || phase.value === "settle",
  );
  const actionHint = computed(() => {
    if (phase.value === "call") {
      if (!currentPlayer.value) return "正在重新发牌...";
      if (turnUid.value === human.value.uid) return "请选择是否叫地主";
      return `${currentPlayer.value.name} 正在考虑...`;
    }
    if (phase.value === "rob") {
      if (decisionLocked.value) return "";
      if (!currentPlayer.value) return "正在重新发牌...";
      if (turnUid.value === human.value.uid) return "请选择是否抢地主";
      return `${currentPlayer.value.name} 正在考虑抢地主...`;
    }
    if (phase.value === "double") {
      if (decisionLocked.value) return "";
      if (!currentPlayer.value) return "正在结算...";
      if (turnUid.value === human.value.uid) return "请选择是否加倍";
      return `${currentPlayer.value.name} 正在考虑加倍...`;
    }
    if (phase.value === "play") {
      if (!isHumanTurn.value) {
        const p = currentPlayer.value;
        return p ? `${p.name} 思考中...` : "";
      }
      if (humanAuto.value) return "托管中，自动出牌...";
      if (lastPlay.value && lastPlayer.value?.uid === human.value.uid)
        return "请出牌";
      return "轮到你出牌";
    }
    return "";
  });

  function sound(name: Parameters<typeof playSound>[0]): void {
    playSound(name, settings.sound);
  }

  function clearTimer(): void {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
  }

  function clearBombFx(): void {
    if (fxTimer) {
      clearTimeout(fxTimer);
      fxTimer = null;
    }
    bombBanner.value = null;
  }

  function showBombFx(
    kind: "bombStraight" | "kingBomb",
    length: number,
  ): void {
    if (!settings.animation) return;
    bombBanner.value = { kind, length };
    if (fxTimer) clearTimeout(fxTimer);
    const bombs =
      kind === "kingBomb" ? 2 : Math.max(2, Math.round(length / 4));
    const duration = Math.min(2800, 1100 + bombs * 320);
    fxTimer = setTimeout(() => {
      bombBanner.value = null;
      fxTimer = null;
    }, duration);
  }

  function schedule(fn: () => void, delay: number): void {
    clearTimer();
    const token = gameToken;
    aiTimer = setTimeout(() => {
      if (token !== gameToken) return;
      aiTimer = null;
      fn();
    }, delay);
  }

  function resetPlayers(): Player[] {
    return createPlayers();
  }

  function setDecision(uid: string, text: string): void {
    tableDecisions.value = { ...tableDecisions.value, [uid]: text };
  }

  function buildAIContext(selfUid: string): MoveContext {
    const order: AIPlayerInfo[] = players.value.map((p) => ({
      uid: p.uid,
      isLandlord: p.isLandlord,
      handCount: p.hand.length,
    }));
    const self = order.find((p) => p.uid === selfUid) ?? order[0];
    const lord = players.value.find((p) => p.isLandlord);
    return {
      self,
      players: order,
      lastPlayerUid: lastPlayerUid.value,
      landlordUid: lord?.uid ?? "",
      playedCards: playedCards.value,
    };
  }

  function newGame(roomId?: string): void {
    if (roomId) room.value = getRoom(roomId);
    gameToken++;
    clearTimer();
    clearBombFx();
    setBombStraightEnabled(!settings.shuffle);
    resetHint();
    const dealt = dealCards(settings.shuffle);
    players.value = resetPlayers();
    players.value.forEach((p, i) => {
      p.hand = dealt.hands[i];
    });
    bottomCards.value = dealt.bottom;
    lastPlay.value = null;
    lastPlayerUid.value = null;
    multiple.value = room.value.multiplier;
    winner.value = null;
    winnerSide.value = null;
    resultReady.value = false;
    resultDismissed.value = false;
    springBanner.value = null;
    selectedIds.value = [];
    callActed.value = 0;
    passCount.value = 0;
    tableActions.value = {};
    tableDecisions.value = {};
    playedCards.value = [];
    playCounts.value = {};
    actionSeq.value = [];
    playedBySeat.value = {};
    lastMoveBySeat.value = {};
    beanDeltas.value = {};
    tentativeLandlordUid.value = null;
    robQueue.value = [];
    robIndex.value = 0;
    robHappened.value = false;
    doubleActed.value = 0;
    decisionLocked.value = false;
    round.value++;
    phase.value = "call";

    turnUid.value = players.value[0].uid;
    message.value = "请决定是否叫地主";
    sound("deal");
    handleTurn();
  }

  function handleTurn(): void {
    if (phase.value === "call") {
      const p = currentPlayer.value;
      if (!p) return;
      if (p.isRobot) {
        schedule(() => {
          if (phase.value !== "call") return;
          const cur = currentPlayer.value;
          if (!cur || !cur.isRobot) return;
          callLandlord(cur.uid, chooseCall(cur.hand, callActed.value));
        }, 950);
      }
      return;
    }

    if (phase.value === "rob") {
      const p = currentPlayer.value;
      if (!p) return;
      if (p.isRobot) {
        schedule(() => {
          if (phase.value !== "rob") return;
          const cur = currentPlayer.value;
          if (!cur || !cur.isRobot) return;
          robLandlord(cur.uid, Math.random() < 0.4);
        }, 900);
      }
      return;
    }

    if (phase.value === "double") {
      const p = currentPlayer.value;
      if (!p) return;
      if (p.isRobot) {
        schedule(() => {
          if (phase.value !== "double") return;
          const cur = currentPlayer.value;
          if (!cur || !cur.isRobot) return;
          chooseDouble(cur.uid, aiDoubleLevel());
        }, 800);
      }
      return;
    }

    if (phase.value === "play") {
      const p = currentPlayer.value;
      if (!p) return;
      const auto = p.isRobot || (p.uid === human.value.uid && p.isTrustee);
      if (!auto) return;
      schedule(() => {
        if (phase.value !== "play") return;
        void aiPlay();
      }, 500);
    }
  }

  function advanceTurn(): void {
    const index = players.value.findIndex((p) => p.uid === turnUid.value);
    const next = (index + 1) % players.value.length;
    turnUid.value = players.value[next].uid;
  }

  function callLandlord(uid: string, call: boolean): void {
    if (phase.value !== "call") return;
    const player = players.value.find((p) => p.uid === uid);
    if (!player) return;

    if (call) {
      const callerIndex = players.value.findIndex((p) => p.uid === uid);
      tentativeLandlordUid.value = uid;
      setDecision(uid, "叫地主");
      robQueue.value = [1, 2, 0].map(
        (step) =>
          players.value[
            (callerIndex + step) % players.value.length
          ].uid,
      );
      robIndex.value = 0;
      robHappened.value = false;
      doubleActed.value = 0;
      decisionLocked.value = false;
      phase.value = "rob";
      turnUid.value = robQueue.value[0];
      message.value = `${player.name} 叫地主，等待抢地主`;
      sound("button");
      handleTurn();
      return;
    }

    callActed.value++;
    setDecision(uid, "不叫");
    sound("pass");
    if (callActed.value >= 3) {
      turnUid.value = "";
      message.value = "三家都不叫，重新发牌";
      schedule(() => {
        newGame();
      }, 1200);
      return;
    }

    message.value = `${player.name} 不叫`;
    advanceTurn();
    handleTurn();
  }

  function humanCall(call: boolean): void {
    if (phase.value !== "call" || turnUid.value !== human.value.uid) return;
    callLandlord(human.value.uid, call);
  }

  function advanceAfterRob(): void {
    decisionLocked.value = false;
    robIndex.value++;
    if (robIndex.value >= robQueue.value.length) {
      finalizeLandlord();
      return;
    }
    const nextUid = robQueue.value[robIndex.value];
    if (nextUid === tentativeLandlordUid.value) {
      finalizeLandlord();
      return;
    }
    turnUid.value = nextUid;
    handleTurn();
  }

  function robLandlord(uid: string, rob: boolean): void {
    if (decisionLocked.value) return;
    if (phase.value !== "rob" || turnUid.value !== uid) return;
    if (uid === tentativeLandlordUid.value) return;
    const player = players.value.find((p) => p.uid === uid);
    if (!player) return;
    setDecision(uid, rob ? "抢地主" : "不抢");

    if (rob) {
      tentativeLandlordUid.value = uid;
      multiple.value *= 2;
      robHappened.value = true;
      message.value = `${player.name} 抢地主，倍数 ×${multiple.value}`;
      sound("button");
    } else {
      message.value = `${player.name} 不抢`;
      sound("pass");
    }

    decisionLocked.value = true;
    schedule(advanceAfterRob, DECISION_HOLD);
  }

  function humanRob(rob: boolean): void {
    if (phase.value !== "rob" || turnUid.value !== human.value.uid) return;
    robLandlord(human.value.uid, rob);
  }

  function finalizeLandlord(): void {
    const lord = players.value.find(
      (p) => p.uid === tentativeLandlordUid.value,
    );
    if (!lord) {
      newGame();
      return;
    }
    for (const player of players.value) {
      player.isLandlord = player.uid === lord.uid;
    }
    lord.hand = sortCards([...lord.hand, ...bottomCards.value]);
    tableDecisions.value = {};
    phase.value = "double";
    doubleActed.value = 0;
    decisionLocked.value = false;
    turnUid.value = lord.uid;
    message.value = `${lord.name} 成为地主，获得底牌`;
    sound("button");
    handleTurn();
  }

  function aiDoubleLevel(): 0 | 1 | 2 {
    const roll = Math.random();
    if (roll < 0.4) return 0;
    if (roll < 0.75) return 1;
    return 2;
  }

  function advanceAfterDouble(): void {
    decisionLocked.value = false;
    doubleActed.value++;
    if (doubleActed.value >= players.value.length) {
      startPlay();
      return;
    }
    advanceTurn();
    handleTurn();
  }

  function chooseDouble(uid: string, level: 0 | 1 | 2): void {
    if (decisionLocked.value) return;
    if (phase.value !== "double" || turnUid.value !== uid) return;
    const player = players.value.find((p) => p.uid === uid);
    if (!player) return;
    const label =
      level === 2 ? "超级加倍" : level === 1 ? "加倍" : "不加倍";
    setDecision(uid, label);

    const factor = level === 2 ? 4 : level === 1 ? 2 : 1;
    if (factor > 1) {
      multiple.value *= factor;
      message.value = `${player.name} ${label}，倍数 ×${multiple.value}`;
      sound("button");
    } else {
      message.value = `${player.name} 不加倍`;
      sound("pass");
    }

    decisionLocked.value = true;
    schedule(advanceAfterDouble, DECISION_HOLD);
  }

  function humanDouble(level: 0 | 1 | 2): void {
    if (phase.value !== "double" || turnUid.value !== human.value.uid) return;
    chooseDouble(human.value.uid, level);
  }

  function startPlay(): void {
    const lord = landlord.value;
    phase.value = "play";
    lastPlay.value = null;
    lastPlayerUid.value = null;
    passCount.value = 0;
    selectedIds.value = [];
    tableActions.value = {};
    tableDecisions.value = {};
    playedCards.value = [];
    playCounts.value = {};
    actionSeq.value = [];
    playedBySeat.value = {};
    lastMoveBySeat.value = {};
    decisionLocked.value = false;
    if (!lord) return;
    preloadDouZero();
    turnUid.value = lord.uid;
    message.value = `${lord.name} 先出牌`;
    handleTurn();
  }

  function checkWin(player: Player): boolean {
    if (player.hand.length > 0) return false;
    phase.value = "settle";
    clearTimer();
    resultReady.value = false;
    resultDismissed.value = false;
    springBanner.value = null;

    const lord = landlord.value;
    let clearReason: ClearReason | null = null;
    if (lord) {
      const landlordWon = player.isLandlord;
      winnerSide.value = landlordWon ? "landlord" : "farmer";
      winner.value = landlordWon
        ? [lord.uid]
        : players.value.filter((p) => !p.isLandlord).map((p) => p.uid);

      const spring = springFactor({
        landlordWon,
        landlordPlayCount: playCounts.value[lord.uid] ?? 0,
        farmerPlayCounts: players.value
          .filter((p) => !p.isLandlord)
          .map((p) => playCounts.value[p.uid] ?? 0),
      });
      if (spring > 1) {
        multiple.value *= spring;
        springBanner.value = landlordWon ? "spring" : "anti";
        clearBombFx();
      }
      message.value =
        (landlordWon ? "地主胜利" : "农民胜利") +
        (spring > 1 ? (landlordWon ? "（春天 ×5）" : "（反春 ×5）") : "");

      const humanWon = winner.value.includes(human.value.uid);
      sound(humanWon ? "win" : "lose");

      if (Object.keys(beanDeltas.value).length === 0) {
        const farmerUids = players.value
          .filter((p) => !p.isLandlord)
          .map((p) => p.uid);
        const balances: Record<string, number> = {};
        for (const player of players.value) {
          balances[player.uid] = wallet.get(player.uid);
        }
        const result = settleBeansWithBankruptcy({
          balances,
          landlordUid: lord.uid,
          farmerUids,
          landlordWon,
          multiple: multiple.value,
          deferSubsidy: true,
        });
        beanDeltas.value = result.deltas;
        wallet.setAll(result.balances);
        const pending = Object.entries(result.subsidies)
          .filter(([, value]) => value > 0)
          .map(([uid]) => uid);
        wallet.addPendingSubsidy(pending);
        const aiBankrupt = Object.entries(result.subsidies).some(
          ([uid, value]) => uid !== human.value.uid && value > 0,
        );
        clearReason = challenge.evaluate(wallet.get(human.value.uid), aiBankrupt);
      }
    }

    // 先展示剩余手牌，动画结束后再弹出结算弹窗
    const finishSettle = (): void => {
      resultReady.value = true;
      if (clearReason) challenge.openCelebration();
    };
    if (springBanner.value) {
      schedule(() => {
        springBanner.value = null;
        schedule(finishSettle, settings.animation ? 1400 : 700);
      }, 1600);
    } else {
      schedule(finishSettle, settings.animation ? 3600 : 1200);
    }
    return true;
  }

  function commitPlay(player: Player, cards: Card[], info: PlayInfo): void {
    const isLead = lastPlay.value === null;
    if (isLead) tableActions.value = {};

    const ids = new Set(cards.map((c) => c.id));
    player.hand = player.hand.filter((c) => !ids.has(c.id));
    playedCards.value = [...playedCards.value, ...cards];
    playCounts.value = {
      ...playCounts.value,
      [player.uid]: (playCounts.value[player.uid] ?? 0) + 1,
    };
    const sortedPlay = sortCards(cards);
    actionSeq.value = [...actionSeq.value, sortedPlay];
    playedBySeat.value = {
      ...playedBySeat.value,
      [player.uid]: [...(playedBySeat.value[player.uid] ?? []), ...cards],
    };
    lastMoveBySeat.value = {
      ...lastMoveBySeat.value,
      [player.uid]: sortedPlay,
    };
    lastPlay.value = sortedPlay;
    lastPlayerUid.value = player.uid;
    passCount.value = 0;
    if (player.uid === human.value.uid) selectedIds.value = [];
    tableActions.value = {
      ...tableActions.value,
      [player.uid]: {
        kind: "play",
        cards: sortCards(cards),
        info,
      },
    };

    if (info.type === "bombStraight") {
      multiple.value *= 2 ** (info.length / 4);
      sound("bomb");
      showBombFx("bombStraight", info.length);
    } else if (info.type === "bomb" || info.type === "kingBomb") {
      multiple.value *= 2;
      sound("bomb");
      if (info.type === "kingBomb") showBombFx("kingBomb", 2);
    } else {
      sound("play");
    }

    message.value = `${player.name} 出了 ${playTypeLabel(info)}`;

    if (checkWin(player)) return;
    advanceTurn();
    handleTurn();
  }

  function humanPlay(): boolean {
    if (!isHumanTurn.value || humanAuto.value) return false;
    if (selectedCards.value.length === 0) {
      message.value = "请先选择要出的牌";
      return false;
    }
    const info = parsePlay(selectedCards.value);
    if (!info) {
      message.value = "牌型不合法，请重新选择";
      return false;
    }
    const previous = lastPlayInfo.value;
    if (previous && lastPlayerUid.value !== human.value.uid) {
      if (!canBeat(info, previous)) {
        message.value = "打不过上家的牌";
        return false;
      }
    }
    commitPlay(human.value, selectedCards.value, info);
    return true;
  }

  function passTurn(player: Player): void {
    if (phase.value !== "play") return;
    if (!lastPlay.value) {
      message.value = "你必须出牌";
      return;
    }
    if (lastPlayerUid.value === player.uid) return;

    passCount.value++;
    sound("pass");
    message.value = `${player.name} 不出`;
    if (player.uid === human.value.uid) selectedIds.value = [];
    tableActions.value = {
      ...tableActions.value,
      [player.uid]: { kind: "pass", cards: [], info: null },
    };
    actionSeq.value = [...actionSeq.value, []];
    lastMoveBySeat.value = {
      ...lastMoveBySeat.value,
      [player.uid]: [],
    };
    advanceTurn();

    if (passCount.value >= 2) {
      passCount.value = 0;
      lastPlay.value = null;
      lastPlayerUid.value = null;
      message.value = "两家都不出，重新领出";
    }
    handleTurn();
  }

  function humanPass(): void {
    if (!canPass.value || humanAuto.value) return;
    passTurn(human.value);
  }

  function humanHint(): void {
    if (!isHumanTurn.value || humanAuto.value) return;

    const last = lastPlayInfo.value;
    const lastOwner = players.value.find(
      (p) => p.uid === lastPlayerUid.value,
    );
    const lastIsTeammate =
      !!lastOwner &&
      !lastOwner.isLandlord &&
      !human.value.isLandlord &&
      lastOwner.uid !== human.value.uid;

    if (last && lastIsTeammate) {
      selectedIds.value = [];
      message.value = "队友出牌，建议不出";
      resetHint();
      sound("pass");
      return;
    }

    const signature = [
      human.value.hand
        .map((c) => c.id)
        .sort()
        .join(","),
      lastPlay.value
        ? lastPlay.value
            .map((c) => c.id)
            .sort()
            .join(",")
        : "",
      turnUid.value,
    ].join("::");

    if (signature !== hintKey || hintMoves.length === 0) {
      hintMoves = suggestMoves(
        human.value.hand,
        last,
        buildAIContext(human.value.uid),
      );
      hintKey = signature;
      hintIndex = 0;
    } else {
      hintIndex = (hintIndex + 1) % hintMoves.length;
    }

    if (hintMoves.length === 0) {
      selectedIds.value = [];
      message.value = last ? "没有能大过上家的牌" : "没有可出的牌";
      sound("pass");
      return;
    }

    const move = hintMoves[hintIndex];
    selectedIds.value = move.cards.map((c) => c.id);
    message.value =
      hintMoves.length > 1
        ? `提示 ${hintIndex + 1}/${hintMoves.length}：${playTypeLabel(move.info)}`
        : `提示：${playTypeLabel(move.info)}`;
    sound("select");
  }

  async function aiPlay(): Promise<void> {
    if (phase.value !== "play") return;
    const player = currentPlayer.value;
    if (!player) return;
    const auto =
      player.isRobot ||
      (player.uid === human.value.uid && player.isTrustee);
    if (!auto) return;

    const token = gameToken;
    const lastInfo = lastPlayInfo.value;
    const canPass =
      !!lastInfo && lastPlayerUid.value !== player.uid;

    const choice = await chooseDouZeroMove({
      myUid: player.uid,
      players: players.value.map((p) => ({
        uid: p.uid,
        isLandlord: p.isLandlord,
        handCount: p.hand.length,
      })),
      myHand: player.hand,
      landlordUid: landlord.value?.uid ?? "",
      playedCards: playedCards.value,
      playedBySeat: playedBySeat.value,
      lastMoveBySeat: lastMoveBySeat.value,
      actionSeq: actionSeq.value,
      last: lastInfo,
      canPass,
    });

    if (
      token !== gameToken ||
      phase.value !== "play" ||
      turnUid.value !== player.uid
    ) {
      return;
    }

    if (choice?.kind === "move") {
      commitPlay(player, choice.move.cards, choice.move.info);
      return;
    }
    if (choice?.kind === "pass" && canPass) {
      passTurn(player);
      return;
    }

    const move = chooseMove(player.hand, lastInfo, buildAIContext(player.uid));
    if (move) {
      commitPlay(player, move.cards, move.info);
      return;
    }
    if (lastInfo) {
      passTurn(player);
      return;
    }

    // 理论上首出一定有牌可出；这里做兜底，避免 AI 卡住
    const fallback = player.hand
      .slice()
      .sort((a, b) => a.rank - b.rank)[0];
    const fallbackInfo = fallback ? parsePlay([fallback]) : null;
    if (fallback && fallbackInfo) {
      commitPlay(player, [fallback], fallbackInfo);
    }
  }

  function selectCard(cardId: string, selected: boolean, silent = false): void {
    if (phase.value !== "play" || humanAuto.value) return;
    const exists = selectedIds.value.includes(cardId);
    if (exists === selected) return;
    selectedIds.value = selected
      ? [...selectedIds.value, cardId]
      : selectedIds.value.filter((id) => id !== cardId);
    if (!silent) sound("select");
  }

  function toggleSelect(cardId: string): void {
    if (phase.value !== "play" || humanAuto.value) return;
    const exists = selectedIds.value.includes(cardId);
    selectCard(cardId, !exists);
  }

  function clearSelection(): void {
    selectedIds.value = [];
  }

  function toggleTrustee(): void {
    human.value.isTrustee = !human.value.isTrustee;
    if (human.value.isTrustee && isHumanTurn.value) {
      handleTurn();
    }
  }

  function dismissResult(): void {
    resultReady.value = false;
    resultDismissed.value = true;
  }

  function reopenResult(): void {
    resultReady.value = true;
    resultDismissed.value = false;
  }

  function resetAll(): void {
    round.value = 0;
    room.value = ROOMS[0];
    resultReady.value = false;
    resultDismissed.value = false;
    resetToIdle();
  }

  function resetToIdle(): void {
    gameToken++;
    clearTimer();
    clearBombFx();
    resetHint();
    phase.value = "idle";
    players.value = resetPlayers();
    bottomCards.value = [];
    lastPlay.value = null;
    lastPlayerUid.value = null;
    winner.value = null;
    winnerSide.value = null;
    resultReady.value = false;
    resultDismissed.value = false;
    springBanner.value = null;
    selectedIds.value = [];
    message.value = "";
    turnUid.value = "";
    multiple.value = room.value.multiplier;
    tableActions.value = {};
    tableDecisions.value = {};
    playedCards.value = [];
    playCounts.value = {};
    actionSeq.value = [];
    playedBySeat.value = {};
    lastMoveBySeat.value = {};
    beanDeltas.value = {};
    tentativeLandlordUid.value = null;
    robQueue.value = [];
    robIndex.value = 0;
    robHappened.value = false;
    doubleActed.value = 0;
    decisionLocked.value = false;
  }

  return {
    phase,
    players,
    bottomCards,
    turnUid,
    lastPlay,
    lastPlayerUid,
    multiple,
    winner,
    selectedIds,
    message,
    round,
    winnerSide,
    resultReady,
    resultDismissed,
    springBanner,
    bombBanner,
    tableActions,
    tableDecisions,
    playedCards,
    actionSeq,
    playedBySeat,
    lastMoveBySeat,
    room,
    beanDeltas,
    human,
    currentPlayer,
    landlord,
    landlordConfirmed,
    isHumanRobTurn,
    isHumanDoubleTurn,
    lastPlayInfo,
    lastPlayer,
    isHumanTurn,
    humanAuto,
    selectedCards,
    canPass,
    humanIsWinner,
    bottomRevealed,
    actionHint,
    newGame,
    humanCall,
    humanRob,
    humanDouble,
    humanPlay,
    humanPass,
    humanHint,
    passTurn,
    selectCard,
    toggleSelect,
    clearSelection,
    toggleTrustee,
    dismissResult,
    reopenResult,
    resetAll,
    resetToIdle,
  };
});
