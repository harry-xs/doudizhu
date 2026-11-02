<template>
  <div class="seat" :class="[`seat--${side}`, { 'seat--active': active }]">
    <div class="seat__avatar" :class="{ 'seat__avatar--lord': player.isLandlord }">
      <span class="seat__avatar-text">{{ player.isRobot ? "AI" : "你" }}</span>
      <span v-if="player.isLandlord" class="seat__crown">地主</span>
    </div>
    <div class="seat__name">{{ player.name }}</div>
    <div class="seat__tags">
      <span v-if="player.isLandlord" class="tag tag--lord">地主</span>
      <span v-else-if="landlordConfirmed" class="tag tag--farmer">农民</span>
      <span v-if="player.isTrustee" class="tag tag--trustee">托管</span>
    </div>
    <div class="seat__backs">
      <CardBack
        v-for="n in backCount"
        :key="n"
        size="xs"
        class="seat__back"
        :style="{ marginLeft: n === 1 ? '0' : '-14px' }"
      />
      <span v-if="player.hand.length === 0" class="seat__empty">出完啦</span>
    </div>
    <div class="seat__count">剩 {{ player.hand.length }} 张</div>
    <transition name="fade">
      <div v-if="active" class="seat__thinking">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Player } from "@/game/types";
import CardBack from "./CardBack.vue";

const props = defineProps<{
  player: Player;
  active: boolean;
  side: "left" | "right";
  landlordConfirmed: boolean;
}>();

const backCount = computed(() => Math.min(props.player.hand.length, 5));
</script>

<style scoped>
.seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: var(--seat-w, 118px);
  padding: 8px 6px 10px;
  border-radius: 16px;
  background: rgba(6, 34, 23, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.seat--active {
  border-color: rgba(212, 175, 55, 0.75);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.28),
    0 0 24px rgba(212, 175, 55, 0.32);
}

.seat__avatar {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #3d7f63, #1c4d38);
  border: 2px solid rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.18),
    0 4px 10px rgba(0, 0, 0, 0.35);
}

.seat__avatar--lord {
  border-color: var(--gold);
  background: linear-gradient(160deg, #8a6c1a, #4d3a06);
}

.seat__avatar-text {
  font-weight: 800;
  font-size: 15px;
  letter-spacing: 0.04em;
}

.seat__crown {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f0d874, #c39a1f);
  color: #3a2a00;
  white-space: nowrap;
}

.seat__name {
  font-size: 12px;
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat__tags {
  display: flex;
  gap: 3px;
  min-height: 15px;
}

.tag {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 999px;
  line-height: 1.3;
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

.seat__backs {
  display: flex;
  align-items: center;
  height: 34px;
  padding-left: 10px;
}

.seat__back {
  width: 24px;
  flex: 0 0 auto;
  box-shadow: -1px 0 2px rgba(0, 0, 0, 0.35);
}

.seat__empty {
  font-size: 11px;
  color: var(--gold);
  font-weight: 700;
}

.seat__count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.78);
  font-variant-numeric: tabular-nums;
}

.seat__thinking {
  display: flex;
  gap: 3px;
  margin-top: 1px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold);
  animation: blink 1s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.16s;
}
.dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
