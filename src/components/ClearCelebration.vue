<template>
  <transition name="celebrate">
    <div v-if="challenge.celebrationOpen" class="clear">
      <canvas ref="canvasEl" class="clear__canvas"></canvas>
      <div class="clear__content">
        <p class="clear__kicker">CHALLENGE CLEARED</p>
        <h1 class="clear__title">通 关</h1>
        <p class="clear__reason">{{ reasonText }}</p>
        <p class="clear__balance">
          当前余额 ${{ formatBeans(wallet.get("p0")) }}
        </p>
        <button
          type="button"
          class="btn btn-gold clear__btn"
          @click="challenge.closeCelebration()"
        >
          太棒了
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useChallengeStore } from "@/stores/challenge";
import { useWalletStore } from "@/stores/wallet";
import { formatBeans } from "@/game/rooms";

const challenge = useChallengeStore();
const wallet = useWalletStore();

const reasonText = computed(() => {
  if (challenge.reason === "target") return "我方余额突破 $1亿 目标！";
  if (challenge.reason === "bankrupt") return "人机破产，成功通关！";
  return "恭喜通关！";
});

const canvasEl = ref<HTMLCanvasElement | null>(null);

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
}

const PALETTE = [
  "#ffd75e",
  "#ffe89a",
  "#ff6b6b",
  "#4dd0e1",
  "#a78bfa",
  "#7cf59a",
  "#ff9de2",
  "#ffffff",
];

let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let running = false;
let width = 0;
let height = 0;
let lastBurst = 0;
let burstIndex = 0;
const particles: Particle[] = [];
const confetti: Confetti[] = [];

function resize(): void {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawnConfetti(count: number): void {
  for (let i = 0; i < count; i++) {
    confetti.push({
      x: Math.random() * width,
      y: -Math.random() * height * 0.6,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 1.8 + Math.random() * 3.2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.36,
      w: 5 + Math.random() * 8,
      h: 10 + Math.random() * 14,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    });
  }
}

function burst(x: number, y: number): void {
  const base = PALETTE[burstIndex++ % PALETTE.length];
  const secondary =
    PALETTE[(burstIndex + 3) % PALETTE.length];
  const count = 72;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.1;
    const speed = 2.5 + Math.random() * 4.6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.7 + Math.random() * 0.6,
      size: 1.4 + Math.random() * 2.6,
      color: Math.random() < 0.6 ? base : secondary,
    });
  }
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.5,
      size: 2.6 + Math.random() * 2.2,
      color: "#ffffff",
    });
  }
}

function frame(time: number): void {
  if (!running || !ctx) return;
  ctx.clearRect(0, 0, width, height);

  const interval = 380;
  if (time - lastBurst > interval) {
    lastBurst = time;
    burst(
      width * (0.16 + Math.random() * 0.68),
      height * (0.16 + Math.random() * 0.4),
    );
    if (Math.random() < 0.4) {
      burst(width * (0.2 + Math.random() * 0.6), height * (0.2 + Math.random() * 0.3));
    }
  }

  ctx.globalCompositeOperation = "lighter";
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life -= 0.012;
    particle.vx *= 0.988;
    particle.vy = particle.vy * 0.988 + 0.05;
    particle.x += particle.vx;
    particle.y += particle.vy;
    if (
      particle.life <= 0 ||
      particle.x < -40 ||
      particle.x > width + 40 ||
      particle.y > height + 60
    ) {
      particles.splice(i, 1);
      continue;
    }
    const alpha = Math.max(0, Math.min(1, particle.life));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 16;
    ctx.shadowColor = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = "source-over";
  for (const bit of confetti) {
    bit.x += bit.vx;
    bit.y += bit.vy;
    bit.vy += 0.02;
    bit.rot += bit.vr;
    if (bit.y > height + 30) {
      bit.y = -20;
      bit.x = Math.random() * width;
      bit.vy = 1.8 + Math.random() * 3.2;
    }
    ctx.save();
    ctx.translate(bit.x, bit.y);
    ctx.rotate(bit.rot);
    ctx.fillStyle = bit.color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  raf = requestAnimationFrame(frame);
}

function start(): void {
  if (running) return;
  resize();
  if (!canvasEl.value) return;
  particles.length = 0;
  confetti.length = 0;
  spawnConfetti(160);
  burst(width / 2, height * 0.36);
  lastBurst = performance.now();
  running = true;
  raf = requestAnimationFrame(frame);
}

function stop(): void {
  running = false;
  cancelAnimationFrame(raf);
  particles.length = 0;
  confetti.length = 0;
  ctx?.clearRect(0, 0, width, height);
}

watch(
  () => challenge.celebrationOpen,
  (open) => {
    if (open) {
      void nextTick(start);
    } else {
      stop();
    }
  },
  { immediate: true },
);

onBeforeUnmount(stop);
</script>

<style scoped>
.clear {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(
    circle at 50% 38%,
    rgba(22, 76, 50, 0.72),
    rgba(3, 14, 10, 0.96) 64%,
    #010604 100%
  );
}

.clear::before {
  content: "";
  position: absolute;
  width: 160vmax;
  height: 160vmax;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(255, 215, 94, 0.14) 0deg 3deg,
    transparent 3deg 16deg
  );
  animation: clear-spin 26s linear infinite;
  opacity: 0.65;
  filter: blur(0.4px);
  pointer-events: none;
}

.clear__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.clear__content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 24px;
  animation: clear-pop 0.55s cubic-bezier(0.2, 1.4, 0.4, 1);
}

.clear__kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.42em;
  color: rgba(255, 255, 255, 0.66);
}

.clear__title {
  margin: 6px 0 4px;
  font-size: clamp(72px, 20vw, 148px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.12em;
  background: linear-gradient(180deg, #fffbe0, #ffd75e 42%, #d4a92a 70%, #b8860b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 26px rgba(255, 215, 94, 0.55))
    drop-shadow(0 10px 22px rgba(0, 0, 0, 0.45));
  animation: clear-glow 2.2s ease-in-out infinite;
}

.clear__reason {
  margin: 8px 0 0;
  font-size: clamp(16px, 4.4vw, 22px);
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.clear__balance {
  margin: 10px 0 0;
  font-size: clamp(18px, 5vw, 26px);
  font-weight: 900;
  color: #ffe38a;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 16px rgba(255, 215, 94, 0.45);
}

.clear__btn {
  margin-top: 24px;
  min-width: 168px;
  height: 50px;
  font-size: 17px;
  letter-spacing: 0.12em;
}

@keyframes clear-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes clear-pop {
  from {
    opacity: 0;
    transform: scale(0.82) translateY(16px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes clear-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 22px rgba(255, 215, 94, 0.45))
      drop-shadow(0 10px 22px rgba(0, 0, 0, 0.45));
  }
  50% {
    filter: drop-shadow(0 0 42px rgba(255, 215, 94, 0.85))
      drop-shadow(0 10px 26px rgba(0, 0, 0, 0.5));
  }
}

.celebrate-enter-active,
.celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.celebrate-enter-from,
.celebrate-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .clear::before,
  .clear__title {
    animation: none;
  }
}
</style>
