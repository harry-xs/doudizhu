import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Card, GamePhase, PlayInfo, Player, TableAction } from "@/game/types";
import { TYPE_LABEL } from "@/game/types";
import { dealCards, sortCards } from "@/game/deck";
import { canBeat, parsePlay } from "@/game/rules";
import { chooseCall, chooseMove, generateBeatingMoves } from "@/game/moves";
import { playSound } from "@/game/sound";
import { useSettingsStore } from "./settings";

const AI_NAMES = ["电脑小美", "电脑老王"];

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

  let gameToken = 0;
  let aiTimer: ReturnType<typeof setTimeout> | null = null;

  const human = computed(() => players.value[0]);
  const currentPlayer = computed(
    () => players.value.find((p) => p.uid === turnUid.value) ?? null,
  );
  const landlord = computed(
    () => players.value.find((p) => p.isLandlord) ?? null,
  );
  const landlordConfirmed = computed(() => landlord.value !== null);
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

  function newGame(): void {
    gameToken++;
    clearTimer();
    const dealt = dealCards();
    players.value = resetPlayers();
    players.value.forEach((p, i) => {
      p.hand = dealt.hands[i];
    });
    bottomCards.value = dealt.bottom;
    lastPlay.value = null;
    lastPlayerUid.value = null;
    multiple.value = 1;
    winner.value = null;
    winnerSide.value = null;
    selectedIds.value = [];
    callActed.value = 0;
    passCount.value = 0;
    tableActions.value = {};
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
          callLandlord(cur.uid, chooseCall(cur.hand));
        }, 950);
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
        aiPlay();
      }, 900);
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
      player.isLandlord = true;
      player.hand = sortCards([...player.hand, ...bottomCards.value]);
      phase.value = "play";
      turnUid.value = player.uid;
      lastPlay.value = null;
      lastPlayerUid.value = null;
      passCount.value = 0;
      multiple.value = 1;
      message.value = `${player.name} 成为地主，获得底牌`;
      sound("button");
      handleTurn();
      return;
    }

    callActed.value++;
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

  function checkWin(player: Player): boolean {
    if (player.hand.length > 0) return false;
    phase.value = "settle";
    clearTimer();
    const lord = landlord.value;
    if (!lord) return true;
    const landlordWon = player.isLandlord;
    winnerSide.value = landlordWon ? "landlord" : "farmer";
    winner.value = landlordWon
      ? [lord.uid]
      : players.value.filter((p) => !p.isLandlord).map((p) => p.uid);
    message.value = landlordWon ? "地主胜利" : "农民胜利";

    const humanWon = winner.value.includes(human.value.uid);
    sound(humanWon ? "win" : "lose");
    return true;
  }

  function commitPlay(player: Player, cards: Card[], info: PlayInfo): void {
    const isLead = lastPlay.value === null;
    if (isLead) tableActions.value = {};

    const ids = new Set(cards.map((c) => c.id));
    player.hand = player.hand.filter((c) => !ids.has(c.id));
    lastPlay.value = sortCards(cards);
    lastPlayerUid.value = player.uid;
    passCount.value = 0;
    selectedIds.value = [];
    tableActions.value = {
      ...tableActions.value,
      [player.uid]: {
        kind: "play",
        cards: sortCards(cards),
        info,
      },
    };

    if (info.type === "bomb" || info.type === "kingBomb") {
      multiple.value *= 2;
      sound("bomb");
    } else {
      sound("play");
    }

    message.value = `${player.name} 出了 ${TYPE_LABEL[info.type]}`;

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
    selectedIds.value = [];
    tableActions.value = {
      ...tableActions.value,
      [player.uid]: { kind: "pass", cards: [], info: null },
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
    if (last && lastPlayerUid.value !== human.value.uid) {
      const moves = generateBeatingMoves(human.value.hand, last);
      if (moves.length === 0) {
        selectedIds.value = [];
        message.value = "没有能大过上家的牌";
        sound("pass");
        return;
      }
      const normal = moves.filter(
        (m) => m.info.type !== "bomb" && m.info.type !== "kingBomb",
      );
      const pool = normal.length > 0 ? normal : moves;
      pool.sort(
        (a, b) => a.info.rank - b.info.rank || a.cards.length - b.cards.length,
      );
      selectedIds.value = pool[0].cards.map((c) => c.id);
      message.value = `提示：${TYPE_LABEL[pool[0].info.type]}`;
      sound("select");
      return;
    }

    const move = chooseMove(human.value.hand, null, {
      isFarmer: !human.value.isLandlord,
      lastPlayerIsTeammate: false,
      lastPlayerCardCount: 0,
    });
    if (move) {
      selectedIds.value = move.cards.map((c) => c.id);
      message.value = `提示：${TYPE_LABEL[move.info.type]}`;
      sound("select");
    } else {
      message.value = "没有可出的牌";
    }
  }

  function aiPlay(): void {
    if (phase.value !== "play") return;
    const player = currentPlayer.value;
    if (!player) return;
    const auto = player.isRobot || (player.uid === human.value.uid && player.isTrustee);
    if (!auto) return;

    const lastInfo = lastPlayInfo.value;
    const owner = lastPlayer.value;
    const teammate =
      lastInfo && owner
        ? !owner.isLandlord && !player.isLandlord
        : false;
    const move = chooseMove(player.hand, lastInfo, {
      isFarmer: !player.isLandlord,
      lastPlayerIsTeammate: teammate,
      lastPlayerCardCount: owner?.hand.length ?? 0,
    });

    if (move) {
      commitPlay(player, move.cards, move.info);
      return;
    }
    if (lastInfo) {
      passTurn(player);
    }
  }

  function toggleSelect(cardId: string): void {
    if (!isHumanTurn.value || humanAuto.value) return;
    const exists = selectedIds.value.includes(cardId);
    selectedIds.value = exists
      ? selectedIds.value.filter((id) => id !== cardId)
      : [...selectedIds.value, cardId];
    sound("select");
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

  function resetToIdle(): void {
    gameToken++;
    clearTimer();
    phase.value = "idle";
    players.value = resetPlayers();
    bottomCards.value = [];
    lastPlay.value = null;
    lastPlayerUid.value = null;
    winner.value = null;
    winnerSide.value = null;
    selectedIds.value = [];
    message.value = "";
    turnUid.value = "";
    multiple.value = 1;
    tableActions.value = {};
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
    tableActions,
    human,
    currentPlayer,
    landlord,
    landlordConfirmed,
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
    humanPlay,
    humanPass,
    humanHint,
    passTurn,
    toggleSelect,
    clearSelection,
    toggleTrustee,
    resetToIdle,
  };
});
