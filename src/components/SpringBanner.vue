<template>
  <transition name="spring">
    <div
      v-if="kind"
      class="spring"
      :class="`spring--${kind}`"
      aria-hidden="true"
    >
      <div class="spring__rays"></div>
      <div class="spring__decor">
        <span
          v-for="n in 16"
          :key="n"
          class="spring__petal"
          :style="petalStyle(n)"
        ></span>
      </div>
      <div class="spring__content">
        <span class="spring__kicker">
          {{ kind === "spring" ? "SPRING" : "ANTI SPRING" }}
        </span>
        <span class="spring__title">
          {{ kind === "spring" ? "春 天" : "反 春" }}
        </span>
        <span class="spring__flourish"></span>
        <span class="spring__sub">
          {{ kind === "spring" ? "地主全胜 · 农民未出一牌" : "农民逆袭 · 地主只出一手" }}
        </span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import type { CSSProperties } from "vue";

defineProps<{ kind: "spring" | "anti" | null }>();

const SPRING_COLORS = [
  "#ffe38a",
  "#ffd1dc",
  "#c8f7a8",
  "#f7e7a1",
  "#b7f0c0",
  "#ffc9a3",
];
function petalStyle(n: number): CSSProperties {
  const left = (n * 37) % 100;
  const delay = ((n * 13) % 20) / 10;
  const duration = 2.4 + ((n * 7) % 18) / 10;
  const size = 6 + (n % 5) * 2;
  const color = SPRING_COLORS[n % SPRING_COLORS.length];
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size * 1.5}px`,
    background: color,
    animationDelay: `-${delay}s`,
    animationDuration: `${duration}s`,
    opacity: 0.9,
  };
}
</script>

<style scoped>
.spring {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 42%,
    rgba(118, 196, 118, 0.22),
    rgba(4, 24, 12, 0.12) 42%,
    rgba(2, 10, 5, 0.28) 78%
  );
}

.spring--anti {
  background: radial-gradient(
    circle at 50% 42%,
    rgba(120, 196, 255, 0.24),
    rgba(4, 16, 30, 0.14) 42%,
    rgba(2, 6, 16, 0.3) 78%
  );
}

.spring__rays {
  position: absolute;
  width: 160vmax;
  height: 160vmax;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(255, 231, 150, 0.13) 0deg 3deg,
    transparent 3deg 15deg
  );
  animation: spring-spin 20s linear infinite;
  mask-image: radial-gradient(circle, #000 0%, transparent 62%);
}

.spring--anti .spring__rays {
  background: repeating-conic-gradient(
    from 0deg,
    rgba(160, 226, 255, 0.16) 0deg 2deg,
    transparent 2deg 14deg
  );
}

.spring__decor {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.spring__petal {
  position: absolute;
  top: -14vh;
  border-radius: 70% 20% 70% 20%;
  box-shadow: 0 0 8px rgba(255, 236, 170, 0.35);
  animation-name: petal-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.spring--anti .spring__petal {
  border-radius: 2px;
  background: #bfeaff !important;
  box-shadow: 0 0 10px rgba(150, 225, 255, 0.65);
  transform: rotate(45deg);
}

.spring__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px;
  text-align: center;
  animation: spring-content-in 0.58s cubic-bezier(0.2, 1.35, 0.4, 1);
}

.spring__kicker {
  font-size: clamp(11px, 3vw, 15px);
  font-weight: 800;
  letter-spacing: 0.62em;
  text-indent: 0.62em;
  color: rgba(255, 247, 205, 0.7);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.spring--anti .spring__kicker {
  color: rgba(200, 242, 255, 0.72);
}

.spring__title {
  font-family: "STKaiti", "KaiTi", "Songti SC", "Noto Serif SC", serif;
  font-size: clamp(76px, 22vw, 172px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  background: linear-gradient(
    180deg,
    #fffbe1 0%,
    #ffe89a 28%,
    #ffd75e 50%,
    #c8f37a 78%,
    #7fd36a 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 22px rgba(255, 222, 120, 0.55))
    drop-shadow(0 12px 26px rgba(0, 0, 0, 0.5));
  animation: spring-title-glow 1.5s ease-in-out infinite;
}

.spring--anti .spring__title {
  background: linear-gradient(
    180deg,
    #ffffff 0%,
    #e2f8ff 25%,
    #a9e7ff 48%,
    #6dc9ff 72%,
    #3d8dff 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 0 26px rgba(120, 210, 255, 0.7))
    drop-shadow(0 12px 26px rgba(0, 0, 0, 0.55));
}

.spring__flourish {
  width: clamp(150px, 44vw, 320px);
  height: 2px;
  margin: 6px 0 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 226, 133, 0.2),
    rgba(255, 233, 160, 0.95),
    rgba(255, 226, 133, 0.2),
    transparent
  );
  box-shadow: 0 0 16px rgba(255, 225, 120, 0.5);
}

.spring--anti .spring__flourish {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(150, 225, 255, 0.2),
    rgba(210, 245, 255, 0.95),
    rgba(150, 225, 255, 0.2),
    transparent
  );
  box-shadow: 0 0 16px rgba(120, 210, 255, 0.6);
}

.spring__sub {
  font-size: clamp(12px, 3.4vw, 17px);
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(255, 250, 225, 0.78);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.spring--anti .spring__sub {
  color: rgba(210, 244, 255, 0.82);
}

@keyframes petal-fall {
  from {
    transform: translateY(-10vh) rotate(0deg);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  to {
    transform: translateY(115vh) rotate(680deg);
    opacity: 0;
  }
}

@keyframes spring-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes spring-content-in {
  from {
    opacity: 0;
    transform: scale(0.72) translateY(18px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

@keyframes spring-title-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 18px rgba(255, 222, 120, 0.45))
      drop-shadow(0 12px 26px rgba(0, 0, 0, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 36px rgba(255, 232, 150, 0.85))
      drop-shadow(0 12px 30px rgba(0, 0, 0, 0.55));
  }
}

.spring-leave-active {
  transition: opacity 0.38s ease;
}

.spring-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .spring__rays,
  .spring__petal,
  .spring__title,
  .spring__content {
    animation: none;
  }
}
</style>
