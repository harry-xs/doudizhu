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
      </div>

      <div class="actions">
        <button type="button" class="btn btn-gold action action--main" @click="startGame">
          开始游戏
        </button>
        <div class="actions__row">
          <button type="button" class="btn btn-ghost action" @click="router.push('/rule')">
            游戏规则
          </button>
          <button type="button" class="btn btn-ghost action" @click="settingsOpen = true">
            设置
          </button>
        </div>
      </div>

      <p class="home__foot">纯前端实现 · 支持添加到桌面离线游玩</p>
    </main>

    <SettingsPanel :open="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import type { Card } from "@/game/types";
import PlayingCard from "@/components/PlayingCard.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import { useGameStore } from "@/stores/game";
import { playSound } from "@/game/sound";
import { useSettingsStore } from "@/stores/settings";

const router = useRouter();
const game = useGameStore();
const settings = useSettingsStore();
const settingsOpen = ref(false);

const demoCards: Card[] = [
  { id: "demo-1", suit: "spade", rank: 14 },
  { id: "demo-2", suit: "heart", rank: 15 },
  { id: "demo-3", suit: "joker", rank: 17 },
];

function startGame(): void {
  playSound("button", settings.sound);
  game.newGame();
  void router.push("/game");
}
</script>

<style scoped>
.home {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px calc(32px + env(safe-area-inset-bottom));
  overflow: hidden;
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

.actions {
  width: min(300px, 100%);
  margin-top: 38px;
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

.home__foot {
  margin: 30px 0 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.42);
}
</style>
