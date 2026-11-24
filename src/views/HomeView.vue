<template>
  <div class="home felt-bg">
    <main class="home__inner">
      <div class="hero">
        <p class="hero__kicker">经典玩法 · 单机人机对战</p>
        <h1 class="hero__title">斗地主</h1>
        <p class="hero__sub">无需联网 · 随时随地开一局</p>

        <div class="hero__cards">
          <div class="hero__card hero__card--1">
            <PlayingCard :card="demoCards[0]" size="sm" />
          </div>
          <div class="hero__card hero__card--2">
            <PlayingCard :card="demoCards[1]" size="sm" />
          </div>
          <div class="hero__card hero__card--3">
            <PlayingCard :card="demoCards[2]" size="sm" />
          </div>
        </div>

        <div class="wallet glass" @click="onWalletClick">
          <span class="wallet__label">我的余额</span>
          <strong
            class="wallet__value"
            :class="{ 'wallet__value--neg': beans < 0 }"
          >
            ${{ formatBeans(beans) }}
          </strong>
        </div>
      </div>

      <div class="rooms">
        <button
          v-for="room in ROOMS"
          :key="room.id"
          type="button"
          class="room"
          :class="{ 'room--locked': beans < room.minBeans }"
          :disabled="beans < room.minBeans"
          :title="
            beans < room.minBeans
              ? `余额不足，需 $${formatBeans(room.minBeans)}`
              : ''
          "
          @click="startGame(room.id)"
        >
          <span class="room__name">{{ room.name }}</span>
          <span class="room__mult">×{{ room.multiplier }}</span>
          <span class="room__base">
            {{ room.minBeans > 0 ? `入场 $${formatBeans(room.minBeans)}` : "无门槛" }}
          </span>
        </button>
      </div>

      <div class="actions">
        <div class="actions__row">
          <button type="button" class="btn btn-ghost action" @click="router.push('/rule')">
            游戏规则
          </button>
          <button type="button" class="btn btn-ghost action" @click="settingsOpen = true">
            设置
          </button>
        </div>
      </div>
    </main>

    <SettingsPanel :open="settingsOpen" @close="settingsOpen = false" />
    <GoldAdminModal
      :open="goldAdminOpen"
      @close="goldAdminOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import type { Card } from "@/game/types";
import { ROOMS, formatBeans } from "@/game/rooms";
import PlayingCard from "@/components/PlayingCard.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import GoldAdminModal from "@/components/GoldAdminModal.vue";
import { useGameStore } from "@/stores/game";
import { useWalletStore } from "@/stores/wallet";
import { playSound } from "@/game/sound";
import { useSettingsStore } from "@/stores/settings";

const router = useRouter();
const game = useGameStore();
const wallet = useWalletStore();
const settings = useSettingsStore();
const settingsOpen = ref(false);
const goldAdminOpen = ref(false);
const beans = computed(() => wallet.get("p0"));

let walletClicks = 0;
let walletTimer: ReturnType<typeof setTimeout> | null = null;

function onWalletClick(): void {
  walletClicks++;
  if (walletTimer) clearTimeout(walletTimer);
  if (walletClicks >= 3) {
    walletClicks = 0;
    walletTimer = null;
    goldAdminOpen.value = true;
    return;
  }
  walletTimer = setTimeout(() => {
    walletClicks = 0;
    walletTimer = null;
  }, 800);
}

onBeforeUnmount(() => {
  if (walletTimer) clearTimeout(walletTimer);
});

const demoCards: Card[] = [
  { id: "demo-1", suit: "spade", rank: 14 },
  { id: "demo-2", suit: "heart", rank: 15 },
  { id: "demo-3", suit: "joker", rank: 17 },
];

function startGame(roomId: string): void {
  const room = ROOMS.find((item) => item.id === roomId);
  if (!room || beans.value < room.minBeans) return;
  playSound("button", settings.sound);
  game.newGame(roomId);
  void router.push("/game");
}
</script>

<style scoped>
.home {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.home::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(255, 255, 255, 0.1),
    transparent 55%
  );
  pointer-events: none;
}

.home__inner {
  position: relative;
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: auto 0;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero__kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.32em;
  color: rgba(255, 255, 255, 0.62);
  text-transform: uppercase;
}

.hero__title {
  margin: 8px 0 0;
  font-size: clamp(52px, 16vw, 82px);
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  background: linear-gradient(180deg, #fff8d8, #ffd75e 42%, #b8860b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.35));
}

.hero__sub {
  margin: 12px 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.12em;
}

.hero__cards {
  position: relative;
  width: 210px;
  height: 132px;
  margin-top: 30px;
}

.hero__card {
  position: absolute;
  top: 0;
  left: 50%;
  width: 76px;
  transform-origin: 50% 120%;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.4));
  animation: float 4.6s ease-in-out infinite;
}

.hero__card--1 {
  transform: translateX(-50%) translateX(-58px) rotate(-16deg);
  animation-delay: 0s;
}

.hero__card--2 {
  transform: translateX(-50%) rotate(0deg) translateY(-8px);
  animation-delay: 0.35s;
  z-index: 2;
}

.hero__card--3 {
  transform: translateX(-50%) translateX(58px) rotate(16deg);
  animation-delay: 0.7s;
}

@keyframes float {
  0%,
  100% {
    margin-top: 0;
  }
  50% {
    margin-top: -8px;
  }
}

.wallet {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px;
  border-radius: 999px;
}

.wallet__label {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.6);
}

.wallet__value {
  font-size: 18px;
  font-weight: 900;
  color: #ffd75e;
  font-variant-numeric: tabular-nums;
}

.wallet__value--neg {
  color: #ff9b9b;
}

.rooms {
  width: min(340px, 100%);
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.room {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(212, 175, 55, 0.28);
  background: linear-gradient(
    165deg,
    rgba(10, 45, 31, 0.72),
    rgba(5, 26, 18, 0.62)
  );
  color: #fff;
  text-align: left;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.room:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(212, 175, 55, 0.6);
}

.room--locked {
  opacity: 0.45;
  cursor: not-allowed;
}

.room--locked .room__base {
  color: #ff9b9b;
}

.room__name {
  font-size: 14px;
  font-weight: 800;
}

.room__mult {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  color: #ffd75e;
}

.room__base {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.actions {
  width: min(300px, 100%);
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action {
  height: 52px;
  font-size: 16px;
  border-radius: 14px;
}

.action--main {
  height: 56px;
  font-size: 19px;
  letter-spacing: 0.18em;
}

.actions__row {
  display: flex;
  gap: 12px;
}

.actions__row .action {
  flex: 1;
  height: 46px;
  font-size: 14px;
}

</style>
