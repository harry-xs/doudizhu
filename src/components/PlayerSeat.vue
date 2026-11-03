<template>
  <div
    class="seat"
    :class="{
      'seat--active': active,
      'seat--lord': player.isLandlord,
      'seat--left': side === 'left',
      'seat--right': side === 'right',
    }"
  >
    <div class="seat__avatar-row">
      <div class="seat__avatar">
        <svg
          v-if="player.isRobot"
          class="seat__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        >
          <rect x="5" y="7" width="14" height="10" rx="3" />
          <circle cx="9.2" cy="12" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="14.8" cy="12" r="1.15" fill="currentColor" stroke="none" />
          <path d="M12 7V4.6" />
          <circle cx="12" cy="3.6" r="1" fill="currentColor" stroke="none" />
          <path d="M9.5 17h5" />
        </svg>
        <svg
          v-else
          class="seat__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        >
          <circle cx="12" cy="8.4" r="3.6" />
          <path d="M5 20c1.1-3.6 3.8-5.4 7-5.4s5.9 1.8 7 5.4" />
        </svg>

        <span class="seat__badge">{{ player.hand.length }}</span>
        <svg
          v-if="player.isLandlord"
          class="seat__crown"
          viewBox="0 0 32 20"
          aria-hidden="true"
        >
          <path
            d="M3 16h26l-2.6-11.2-6.9 5L16 2.5 12.5 9.8l-6.9-5L3 16z"
            fill="url(#crownGrad)"
            stroke="rgba(90,60,0,.5)"
            stroke-width="1"
          />
          <defs>
            <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fff4b8" />
              <stop offset="0.55" stop-color="#f2c94c" />
              <stop offset="1" stop-color="#b8860b" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div class="seat__info">
        <div class="seat__name">{{ player.name }}</div>
        <div class="seat__tags">
          <span v-if="player.isLandlord" class="tag tag--lord">地主</span>
          <span v-else-if="landlordConfirmed" class="tag tag--farmer">农民</span>
          <span v-if="player.isTrustee" class="tag tag--trustee">托管</span>
          <span v-if="player.hand.length === 0" class="tag tag--done">已出完</span>
        </div>
      </div>
    </div>

    <div class="seat__backs" aria-hidden="true">
      <CardBack
        v-for="n in backCount"
        :key="n"
        size="xs"
        class="seat__back"
        :style="backStyle(n)"
      />
    </div>

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

function backStyle(n: number) {
  const center = (backCount.value + 1) / 2;
  const offset = n - center;
  return {
    marginLeft: n === 1 ? "0" : "-15px",
    transform: `translateY(${Math.abs(offset) * 1.4}px) rotate(${offset * 7}deg)`,
    zIndex: n,
  };
}
</script>

<style scoped>
.seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: var(--seat-w, 118px);
  padding: 9px 7px 7px;
  border-radius: 18px;
  background: linear-gradient(
    165deg,
    rgba(10, 45, 31, 0.72),
    rgba(5, 26, 18, 0.62)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: box-shadow 0.25s ease, border-color 0.25s ease,
    transform 0.25s ease;
  backdrop-filter: blur(6px);
}

.seat--active {
  border-color: rgba(212, 175, 55, 0.8);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.24),
    0 0 26px rgba(212, 175, 55, 0.34), 0 10px 24px rgba(0, 0, 0, 0.28);
}

.seat--lord {
  background: linear-gradient(
    165deg,
    rgba(63, 51, 12, 0.78),
    rgba(29, 24, 8, 0.7)
  );
  border-color: rgba(212, 175, 55, 0.34);
}

.seat__avatar-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
}

.seat__avatar {
  position: relative;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #eafff5;
  background: radial-gradient(circle at 32% 24%, #43886a, #173f2d 72%);
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.16),
    0 4px 10px rgba(0, 0, 0, 0.32);
}

.seat--lord .seat__avatar {
  color: #fff7d6;
  background: radial-gradient(circle at 32% 24%, #b48a2a, #4d3606 74%);
  border-color: rgba(255, 226, 120, 0.7);
}

.seat--active .seat__avatar {
  animation: avatar-pulse 1.5s ease-in-out infinite;
}

@keyframes avatar-pulse {
  0%,
  100% {
    box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.16),
      0 4px 10px rgba(0, 0, 0, 0.32), 0 0 0 0 rgba(255, 216, 94, 0.4);
  }
  50% {
    box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.16),
      0 4px 10px rgba(0, 0, 0, 0.32), 0 0 0 7px rgba(255, 216, 94, 0);
  }
}

.seat__icon {
  width: 22px;
  height: 22px;
}

.seat__badge {
  position: absolute;
  right: -4px;
  bottom: -3px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  color: #2b1d00;
  background: linear-gradient(180deg, #ffe89a, #e6b93c);
  border: 1px solid rgba(255, 250, 225, 0.8);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  font-variant-numeric: tabular-nums;
}

.seat__crown {
  position: absolute;
  top: -11px;
  left: 50%;
  width: 24px;
  height: 15px;
  transform: translateX(-50%);
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
  animation: crown-in 0.35s cubic-bezier(0.2, 1.3, 0.4, 1);
}

@keyframes crown-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px) scale(0.6);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.seat__info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.seat__name {
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  min-height: 13px;
}

.tag {
  font-size: 8.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  line-height: 1.35;
  white-space: nowrap;
}

.tag--lord {
  background: linear-gradient(180deg, #ffe89a, #d4a92a);
  color: #3a2900;
}

.tag--farmer {
  background: rgba(255, 255, 255, 0.14);
  color: #d9f6e8;
}

.tag--trustee {
  background: rgba(96, 165, 250, 0.28);
  color: #cbe6ff;
}

.tag--done {
  background: rgba(255, 255, 255, 0.18);
  color: #ffe89a;
}

.seat__backs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding-top: 2px;
}

.seat__back {
  width: 25px;
  flex: 0 0 auto;
  transform-origin: 50% 100%;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.32));
  transition: transform 0.2s ease;
}

.seat__thinking {
  display: flex;
  gap: 4px;
  height: 6px;
  align-items: center;
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
@media (max-width: 380px) {
  .seat {
    padding: 8px 5px 6px;
  }
  .seat__avatar-row {
    gap: 5px;
  }
  .seat__avatar {
    width: 36px;
    height: 36px;
  }
  .seat__icon {
    width: 19px;
    height: 19px;
  }
  .seat__name {
    font-size: 10.5px;
  }
  .seat__badge {
    min-width: 16px;
    height: 16px;
    font-size: 9px;
  }
  .seat__crown {
    top: -9px;
    width: 21px;
    height: 13px;
  }
}
</style>
