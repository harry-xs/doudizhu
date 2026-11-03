<template>
  <div class="game felt-bg">
    <header class="game__header">
      <button type="button" class="icon-btn" aria-label="返回首页" @click="goHome">
        ←
      </button>
      <div class="scoreboard">
        <div class="scoreboard__item">
          <span class="scoreboard__label">局数</span>
          <strong class="scoreboard__value">{{ game.round }}</strong>
        </div>
        <span class="scoreboard__divider"></span>
        <div class="scoreboard__item">
          <span class="scoreboard__label">倍数</span>
          <strong class="scoreboard__value scoreboard__value--gold">×{{ game.multiple }}</strong>
        </div>
      </div>
      <button type="button" class="icon-btn icon-btn--text" @click="settingsOpen = true">
        设置
      </button>
    </header>

    <main class="table" :class="{ 'table--shake': shaking }">
      <div class="table-rim" aria-hidden="true"></div>
      <div class="table-mark" aria-hidden="true">
        <span class="table-mark__ring"></span>
        <span class="table-mark__glyph">斗</span>
      </div>
      <PlayerSeat
        v-if="leftPlayer"
        class="seat-left"
        :player="leftPlayer"
        side="left"
        :active="isSeatActive(leftPlayer.uid)"
        :landlord-confirmed="game.landlordConfirmed"
      />
      <PlayerSeat
        v-if="rightPlayer"
        class="seat-right"
        :player="rightPlayer"
        side="right"
        :active="isSeatActive(rightPlayer.uid)"
        :landlord-confirmed="game.landlordConfirmed"
      />

      <div class="bottom-cards">
        <span class="bottom-cards__label">底牌</span>
        <div class="bottom-cards__list">
          <div
            v-for="(card, i) in game.bottomCards"
            :key="card.id"
            class="bottom-card"
            :class="`bottom-card--${i}`"
          >
            <PlayingCard
              v-if="game.bottomRevealed"
              :card="card"
              size="xs"
              class="bottom-card__face"
            />
            <CardBack v-else size="xs" />
          </div>
        </div>
      </div>

      <div class="action-zones">
        <div
          v-for="row in actionRows"
          :key="row.player.uid"
          class="action-zone"
          :class="`action-zone--${row.placement}`"
        >
          <div class="action-zone__head">
            <span class="action-zone__name">{{ row.player.name }}</span>
            <span
              v-if="row.action && row.action.kind === 'play' && row.action.info"
              class="action-zone__type"
            >
              {{ TYPE_LABEL[row.action.info.type] }}
            </span>
          </div>
          <div
            v-if="row.action && row.action.kind === 'play'"
            class="action-zone__cards"
          >
            <div
              v-for="(card, i) in row.action.cards"
              :key="card.id"
              class="action-zone__card"
              :style="actionCardStyle(i, row.placement, row.action.cards.length)"
            >
              <PlayingCard
                :card="card"
                :size="row.placement === 'human' ? 'xs' : 'tiny'"
              />
            </div>
          </div>
          <span
            v-else
            class="action-zone__text"
            :class="{
              'action-zone__text--pass': row.action && row.action.kind === 'pass',
            }"
          >
            {{ row.status }}
          </span>
        </div>
      </div>
    </main>

    <footer class="footer">
      <div class="human-meta">
        <span class="human-meta__name">我</span>
        <span v-if="game.human.isLandlord" class="tag tag--lord">地主</span>
        <span v-else-if="game.landlordConfirmed" class="tag tag--farmer">农民</span>
        <span v-if="game.human.isTrustee" class="tag tag--trustee">托管中</span>
        <span class="human-meta__count">{{ game.human.hand.length }} 张</span>
        <span class="human-meta__hint">{{ game.actionHint }}</span>
      </div>

      <div v-if="game.phase !== 'call'" class="selection-line">
        <span
          v-if="selectionState.text"
          class="selection-chip"
          :class="{ 'selection-chip--bad': selectionState.bad }"
        >
          {{ selectionState.text }}
        </span>
        <span v-else class="status-text">{{ game.message }}</span>
      </div>

      <div ref="handEl" class="hand-wrap">
        <div class="hand" @contextmenu.prevent>
          <button
            v-for="(card, i) in game.human.hand"
            :key="game.round + '-' + card.id"
            type="button"
            class="hand-card"
            :class="{
              'hand-card--selected': isSelected(card.id),
              'hand-card--static': !canSelect,
            }"
            :style="handCardStyle(i)"
            :data-card-id="card.id"
            @pointerdown="onCardPointerDown($event, card.id)"
            @click="onCardClick(card.id, $event)"
          >
            <PlayingCard :card="card" :size="cardSize" :selected="isSelected(card.id)" />
          </button>
        </div>
      </div>

      <div class="action-bar">
        <template v-if="game.phase === 'call'">
          <template v-if="isCallTurn">
            <button type="button" class="btn btn-ghost action" @click="game.humanCall(false)">
              不 叫
            </button>
            <button type="button" class="btn btn-gold action action--wide" @click="game.humanCall(true)">
              叫地主
            </button>
          </template>
          <div v-else class="waiting">{{ game.actionHint }}</div>
        </template>

        <template v-else>
          <button
            type="button"
            class="btn btn-ghost action action--trustee"
            :class="{ 'action--on': game.human.isTrustee }"
            @click="game.toggleTrustee()"
          >
            {{ game.human.isTrustee ? "取消托管" : "托管" }}
          </button>

          <template v-if="game.isHumanTurn && !game.humanAuto">
            <button
              type="button"
              class="btn btn-ghost action action--hint"
              :disabled="!canSelect"
              @click="game.humanHint()"
            >
              提 示
            </button>
            <button
              type="button"
              class="btn btn-ghost action"
              :disabled="!game.canPass"
              @click="game.humanPass()"
            >
              {{ passLabel }}
            </button>
            <button
              type="button"
              class="btn btn-gold action action--wide"
              :disabled="!canPlay"
              @click="game.humanPlay()"
            >
              出 牌
            </button>
          </template>
          <div v-else class="waiting">{{ game.actionHint }}</div>
        </template>
      </div>
    </footer>

    <ResultModal
      :show="game.phase === 'settle'"
      :won="game.humanIsWinner"
      :side="game.winnerSide"
      :multiple="game.multiple"
      :round="game.round"
      @restart="restart"
      @home="goHome"
    />

    <SettingsPanel :open="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "@/stores/game";
import { canBeat, parsePlay } from "@/game/rules";
import { generateBeatingMoves } from "@/game/moves";
import { TYPE_LABEL } from "@/game/types";
import type { Player, TableAction } from "@/game/types";
import PlayingCard from "@/components/PlayingCard.vue";
import CardBack from "@/components/CardBack.vue";
import PlayerSeat from "@/components/PlayerSeat.vue";
import ResultModal from "@/components/ResultModal.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";

const router = useRouter();
const game = useGameStore();

const settingsOpen = ref(false);
const shaking = ref(false);
const handEl = ref<HTMLElement | null>(null);
const handWidth = ref(360);
let observer: ResizeObserver | null = null;
let shakeTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => game.multiple,
  (next, previous) => {
    if (next <= previous) return;
    shaking.value = false;
    if (shakeTimer) clearTimeout(shakeTimer);
    requestAnimationFrame(() => {
      shaking.value = true;
    });
    shakeTimer = setTimeout(() => {
      shaking.value = false;
      shakeTimer = null;
    }, 520);
  },
);

const leftPlayer = computed(
  () => game.players.find((p) => p.uid !== game.human.uid && p.uid === "p2") ?? null,
);
const rightPlayer = computed(
  () => game.players.find((p) => p.uid !== game.human.uid && p.uid === "p1") ?? null,
);

const isCallTurn = computed(
  () => game.phase === "call" && game.turnUid === game.human.uid,
);

const canSelect = computed(
  () => game.phase === "play" && !game.humanAuto,
);

const actionRows = computed(() => {
  const rows: {
    player: Player;
    action: TableAction | null;
    status: string;
    placement: "left" | "right" | "human";
  }[] = [];
  const entries: [Player | null, "left" | "right" | "human"][] = [
    [leftPlayer.value, "left"],
    [rightPlayer.value, "right"],
    [game.human, "human"],
  ];
  for (const [player, placement] of entries) {
    if (!player) continue;
    const action = game.tableActions[player.uid] ?? null;
    let status = game.phase === "call" ? "等待叫地主" : "等待出牌";
    if (action?.kind === "pass") status = "不出";
    else if (action?.kind === "play") status = "";
    else if (player.hand.length === 0) status = "已出完";
    rows.push({ player, action, status, placement });
  }
  return rows;
});

function isSeatActive(uid: string): boolean {
  return (
    (game.phase === "call" || game.phase === "play") && game.turnUid === uid
  );
}

const handLayout = computed(() => {
  const count = game.human.hand.length;
  const width = handWidth.value || 360;
  const base = width < 560 ? 46 : 64;
  const maxTotal = width - 6;
  const cardWidth = base;
  const step =
    count > 1
      ? Math.min(cardWidth * 0.58, (maxTotal - cardWidth) / (count - 1))
      : cardWidth;

  return {
    cardWidth: Math.floor(cardWidth),
    overlap: Math.max(10, Math.ceil(cardWidth - Math.max(step, 11))),
  };
});

const cardSize = computed<"md" | "sm" | "xs">(() => {
  if (handLayout.value.cardWidth >= 56) return "md";
  if (handLayout.value.cardWidth >= 42) return "sm";
  return "xs";
});

function isSelected(id: string): boolean {
  return game.selectedIds.includes(id);
}

function actionCardStyle(
  index: number,
  placement: "left" | "right" | "human",
  count: number,
) {
  const width = handWidth.value || 360;
  const zoneWidth =
    placement === "human"
      ? Math.min(width * 0.92, 720)
      : Math.min(width * 0.46, 360);
  const bodyWidth = Math.max(60, zoneWidth - 12);
  const cardWidth =
    placement === "human"
      ? width < 560
        ? 28
        : 34
      : width < 560
        ? 24
        : 30;
  const step =
    count > 1
      ? Math.min(cardWidth * 0.72, (bodyWidth - cardWidth) / (count - 1))
      : cardWidth;
  const overlap = Math.max(0, Math.ceil(cardWidth - Math.max(step, 1)));

  return {
    width: `${cardWidth}px`,
    marginLeft: index === 0 ? "0" : `-${overlap}px`,
    zIndex: index + 1,
  };
}

function handCardStyle(index: number) {
  const visible = handLayout.value.cardWidth - handLayout.value.overlap;
  return {
    width: `${handLayout.value.cardWidth}px`,
    marginLeft: index === 0 ? "0" : `-${handLayout.value.overlap}px`,
    zIndex: index + 1,
    animationDelay: `${Math.min(index * 0.025, 0.4)}s`,
    "--vis": `${visible}px`,
  };
}

type DragMode = "select" | "deselect";

let dragState: { mode: DragMode } | null = null;
let suppressClickUntil = 0;

function cardIdAtPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const cardEl = el?.closest<HTMLElement>(".hand-card");
  return cardEl?.dataset.cardId ?? null;
}

function onCardPointerDown(event: PointerEvent, cardId: string): void {
  if (!canSelect.value) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.preventDefault();
  suppressClickUntil = Date.now() + 400;

  const mode: DragMode = isSelected(cardId) ? "deselect" : "select";
  dragState = { mode };
  game.selectCard(cardId, mode === "select");

  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
}

function onWindowPointerMove(event: PointerEvent): void {
  if (!dragState) return;
  const id = cardIdAtPoint(event.clientX, event.clientY);
  if (!id) return;
  const shouldSelect = dragState.mode === "select";
  if (isSelected(id) !== shouldSelect) {
    game.selectCard(id, shouldSelect, true);
  }
}

function endDrag(): void {
  dragState = null;
  window.removeEventListener("pointermove", onWindowPointerMove);
  window.removeEventListener("pointerup", endDrag);
  window.removeEventListener("pointercancel", endDrag);
}

function onCardClick(cardId: string, event: MouseEvent): void {
  // 指针按下时已经完成选牌；只保留键盘/读屏触发的 click
  if (event.detail > 0 && Date.now() < suppressClickUntil) return;
  game.toggleSelect(cardId);
}

const selectionState = computed(() => {
  const cards = game.selectedCards;
  if (cards.length === 0) return { text: "", bad: false };
  const info = parsePlay(cards);
  if (!info) return { text: "牌型不合法", bad: true };
  const last = game.lastPlayInfo;
  if (
    last &&
    game.lastPlayerUid !== game.human.uid &&
    !canBeat(info, last)
  ) {
    return { text: `${TYPE_LABEL[info.type]} · 打不过上家`, bad: true };
  }
  return { text: TYPE_LABEL[info.type], bad: false };
});

const canPlay = computed(() => {
  if (!game.isHumanTurn || !canSelect.value) return false;
  const cards = game.selectedCards;
  if (cards.length === 0) return false;
  const info = parsePlay(cards);
  if (!info) return false;
  const last = game.lastPlayInfo;
  if (last && game.lastPlayerUid !== game.human.uid) {
    return canBeat(info, last);
  }
  return true;
});

const hasBeatingMove = computed(() => {
  const last = game.lastPlayInfo;
  if (!last || game.lastPlayerUid === game.human.uid) return false;
  return generateBeatingMoves(game.human.hand, last).length > 0;
});

const passLabel = computed(() => {
  const last = game.lastPlayInfo;
  if (!last || game.lastPlayerUid === game.human.uid) return "不 出";
  return hasBeatingMove.value ? "不 出" : "要不起";
});

function measureHand(): void {
  if (handEl.value) handWidth.value = handEl.value.clientWidth;
}

function goHome(): void {
  game.resetToIdle();
  void router.push("/");
}

function restart(): void {
  game.newGame();
}

onMounted(() => {
  if (game.phase === "idle") {
    void router.replace("/");
    return;
  }
  measureHand();
  if (typeof ResizeObserver !== "undefined" && handEl.value) {
    observer = new ResizeObserver(() => measureHand());
    observer.observe(handEl.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  endDrag();
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  game.resetToIdle();
});
</script>

<style scoped>
.game {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.game__header {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: calc(8px + env(safe-area-inset-top)) 12px 8px;
}

.scoreboard {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 15px;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.32),
    rgba(0, 0, 0, 0.16)
  );
  border: 1px solid rgba(212, 175, 55, 0.26);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(6px);
}

.scoreboard__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 38px;
}

.scoreboard__label {
  font-size: 8px;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.48);
}

.scoreboard__value {
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.scoreboard__value--gold {
  color: #ffd75e;
  text-shadow: 0 0 12px rgba(255, 215, 94, 0.35);
}

.scoreboard__divider {
  width: 1px;
  height: 24px;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(212, 175, 55, 0.5),
    transparent
  );
}

.icon-btn {
  min-width: 38px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 16px;
  line-height: 1;
}

.icon-btn--text {
  font-size: 12px;
  font-weight: 600;
}

.table {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 26px;
  background: radial-gradient(
      ellipse at 50% 30%,
      rgba(255, 255, 255, 0.06),
      transparent 58%
    ),
    linear-gradient(160deg, rgba(18, 96, 64, 0.24), rgba(4, 34, 22, 0.32));
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.32);
  overflow: hidden;
}

.table-rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(212, 175, 55, 0.18);
  background: radial-gradient(
      ellipse at 50% 42%,
      transparent 42%,
      rgba(0, 0, 0, 0.22) 100%
    ),
    repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.012) 0px,
      rgba(255, 255, 255, 0.012) 2px,
      transparent 2px,
      transparent 7px
    );
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.035),
    inset 0 0 40px rgba(0, 0, 0, 0.22);
  pointer-events: none;
}

.table--shake {
  animation: table-shake 0.5s ease;
}

@keyframes table-shake {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  15% {
    transform: translate(-4px, 2px) rotate(-0.35deg);
  }
  30% {
    transform: translate(4px, -2px) rotate(0.35deg);
  }
  45% {
    transform: translate(-3px, 1px);
  }
  60% {
    transform: translate(3px, -1px);
  }
  75% {
    transform: translate(-1px, 1px);
  }
}

.table-mark {
  position: absolute;
  left: 50%;
  top: 62%;
  transform: translate(-50%, -50%);
  width: clamp(110px, 26vw, 180px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: rgba(255, 232, 154, 0.075);
  pointer-events: none;
  z-index: 0;
}

.table-mark__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(212, 175, 55, 0.12);
  box-shadow: 0 0 0 10px rgba(212, 175, 55, 0.025),
    inset 0 0 40px rgba(0, 0, 0, 0.14);
}

.table-mark__ring::before,
.table-mark__ring::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.table-mark__ring::before {
  inset: 12%;
}

.table-mark__ring::after {
  inset: 26%;
  border-style: dashed;
  border-color: rgba(212, 175, 55, 0.09);
}

.table-mark__glyph {
  font-size: clamp(56px, 14vw, 96px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.04em;
  transform: rotate(-8deg);
  font-family: "STKaiti", "KaiTi", system-ui, sans-serif;
  text-shadow: 0 0 30px rgba(212, 175, 55, 0.08);
}

.seat-left {
  position: absolute;
  left: 8px;
  top: 4px;
}

.seat-right {
  position: absolute;
  right: 8px;
  top: 4px;
}

.bottom-cards {
  position: absolute;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px 10px 7px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 175, 55, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 6px 16px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(4px);
}

.bottom-cards__label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.26em;
  color: rgba(255, 226, 150, 0.66);
}

.bottom-cards__list {
  display: flex;
  gap: 4px;
}

.bottom-card {
  width: 30px;
  border-radius: 4px;
  transition: transform 0.3s ease;
}

.bottom-card__face {
  animation: card-flip-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

@keyframes card-flip-in {
  from {
    opacity: 0;
    transform: rotateY(90deg) scale(0.9);
  }
  to {
    opacity: 1;
    transform: rotateY(0) scale(1);
  }
}

.action-zones {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.action-zone {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 8px 6px;
  border-radius: 12px;
  background: linear-gradient(
    160deg,
    rgba(4, 30, 20, 0.84),
    rgba(2, 17, 11, 0.74)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  max-width: 100%;
  backdrop-filter: blur(6px);
}

.action-zone::after {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

.action-zone--left {
  left: 8px;
  top: 118px;
  width: min(46%, 360px);
}

.action-zone--left::after {
  top: -12px;
  left: 22px;
  border-bottom-color: rgba(4, 30, 20, 0.86);
}

.action-zone--right {
  right: 8px;
  top: 118px;
  width: min(46%, 360px);
  align-items: flex-end;
}

.action-zone--right::after {
  top: -12px;
  right: 22px;
  border-bottom-color: rgba(4, 30, 20, 0.86);
}

.action-zone--human {
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  width: min(92%, 720px);
  align-items: center;
  background: linear-gradient(
    160deg,
    rgba(72, 58, 14, 0.84),
    rgba(38, 30, 6, 0.78)
  );
  border-color: rgba(212, 175, 55, 0.34);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 20px rgba(212, 175, 55, 0.08);
}

.action-zone--human::after {
  bottom: -12px;
  left: 50%;
  margin-left: -6px;
  border-top-color: rgba(60, 48, 10, 0.82);
}

.action-zone--human .action-zone__head,
.action-zone--human .action-zone__cards {
  justify-content: center;
}

.action-zone--human .action-zone__text {
  text-align: center;
}

.action-zone__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 13px;
}

.action-zone--right .action-zone__head {
  flex-direction: row-reverse;
}

.action-zone__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.82);
}

.action-zone__type {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 800;
  color: #ffe38a;
  background: rgba(212, 175, 55, 0.14);
  border: 1px solid rgba(212, 175, 55, 0.28);
  white-space: nowrap;
}

.action-zone__cards {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 1px;
}

.action-zone--right .action-zone__cards {
  justify-content: flex-end;
}

.action-zone__card {
  flex: 0 0 auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
  animation: play-card-in 0.22s ease backwards;
}

@keyframes play-card-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.action-zone__text {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
}

.action-zone__text--pass {
  align-self: flex-start;
  padding: 2px 10px;
  border-radius: 8px;
  color: #ffd3cf;
  background: rgba(170, 52, 44, 0.2);
  border: 1px dashed rgba(255, 150, 140, 0.5);
  font-weight: 800;
  letter-spacing: 0.18em;
  animation: pass-stamp 0.28s cubic-bezier(0.2, 1.4, 0.4, 1);
}

@keyframes pass-stamp {
  from {
    opacity: 0;
    transform: scale(1.4) rotate(-6deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

.action-zone--right .action-zone__text {
  align-self: flex-end;
}

.action-zone--human .action-zone__text--pass {
  align-self: center;
}

.footer {
  flex: 0 0 auto;
  padding: 0 8px calc(8px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent, rgba(6, 30, 20, 0.55) 30%);
}

.human-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px 2px;
  min-height: 20px;
}

.human-meta__name {
  font-size: 12px;
  font-weight: 800;
}

.human-meta__count {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 999px;
  color: #ffe89a;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.28);
  font-variant-numeric: tabular-nums;
}

.human-meta__hint {
  margin-left: auto;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.tag {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  line-height: 1.4;
}

.tag--lord {
  background: linear-gradient(180deg, #f0d874, #c39a1f);
  color: #3a2a00;
}

.tag--farmer {
  background: rgba(255, 255, 255, 0.16);
  color: #e8fff4;
}

.tag--trustee {
  background: rgba(96, 165, 250, 0.25);
  color: #bfe0ff;
}

.selection-line {
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.status-text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.62);
}

.selection-chip {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(43, 163, 109, 0.28);
  color: #b8ffdc;
  border: 1px solid rgba(43, 163, 109, 0.5);
}

.selection-chip--bad {
  background: rgba(229, 62, 62, 0.22);
  color: #ffc2c2;
  border-color: rgba(229, 62, 62, 0.55);
}

.hand-wrap {
  position: relative;
  width: 100%;
  overflow: visible;
  padding: 20px 0 6px;
  border-radius: 18px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.04),
    rgba(0, 0, 0, 0.2)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 0 1px rgba(255, 255, 255, 0.035);
}

.hand {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 58px;
  padding-bottom: 2px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.hand-card {
  position: relative;
  flex: 0 0 auto;
  padding: 0;
  border: none;
  background: transparent;
  transition: transform 0.14s ease, filter 0.14s ease;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  animation: deal-in 0.3s ease backwards;
}

@keyframes deal-in {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.hand-card:hover:not(.hand-card--static) .pcard {
  filter: brightness(1.05);
}

.hand-card--selected {
  transform: translateY(-14px);
}

.hand-card--selected .pcard {
  box-shadow: 0 0 0 2px #ffd75e, 0 8px 16px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.hand-card--selected::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: var(--vis, 18px);
  height: 5px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(90deg, #ffe89a, #d4af37);
  box-shadow: 0 0 6px rgba(255, 215, 94, 0.8);
}

.hand-card--static {
  cursor: default;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 4px 0;
  min-height: 54px;
}

.action {
  height: 46px;
  min-width: 64px;
  font-size: 14px;
  border-radius: 12px;
  padding: 0 12px;
}

.action--wide {
  flex: 1;
  max-width: 150px;
  letter-spacing: 0.1em;
}

.action--hint {
  min-width: 58px;
  padding: 0 8px;
}

.action--trustee {
  min-width: 58px;
  font-size: 11px;
  padding: 0 8px;
  height: 38px;
  align-self: center;
}

.action--on {
  border-color: rgba(96, 165, 250, 0.7);
  color: #bfe0ff;
  background: rgba(96, 165, 250, 0.18);
}

.waiting {
  flex: 1;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
  letter-spacing: 0.04em;
}

@media (min-width: 760px) {
  .action {
    min-width: 92px;
    height: 50px;
    font-size: 15px;
    padding: 0 18px;
  }
  .action--trustee {
    min-width: 76px;
    height: 40px;
    font-size: 12px;
  }
  .action--hint {
    min-width: 76px;
  }
}

@media (min-width: 600px) {
  .table {
    margin: 0 8px;
  }
}

@media (max-width: 380px) {
  .seat-left {
    left: 4px;
    --seat-w: 102px;
  }
  .seat-right {
    right: 4px;
    --seat-w: 102px;
  }
  .bottom-cards {
    padding: 4px 7px 6px;
  }
  .bottom-card {
    width: 24px;
  }
  .bottom-cards__list {
    gap: 3px;
  }
  .action {
    min-width: 56px;
    padding: 0 8px;
    font-size: 13px;
  }
  .action--wide {
    max-width: none;
  }
  .action--trustee {
    min-width: 54px;
    font-size: 10px;
  }
  .action--hint {
    min-width: 52px;
  }
}
</style>
