<template>
  <transition name="boom-fade">
    <div
      v-if="kind"
      class="boom"
      :class="[`boom--${kind}`, `boom--p${level}`]"
      :style="rootStyle"
      aria-hidden="true"
    >
      <div class="boom__stage">
        <div class="boom__flash"></div>
        <div v-if="power >= 3" class="boom__flash boom__flash--late"></div>

        <div class="boom__smoke">
          <span
            v-for="n in smokeCount"
            :key="`smoke-${n}`"
            class="boom__smoke-puff"
            :style="smokeStyle(n)"
          ></span>
        </div>

        <div class="boom__fireball">
          <span class="boom__blob boom__blob--1"></span>
          <span class="boom__blob boom__blob--2"></span>
          <span class="boom__blob boom__blob--3"></span>
          <span class="boom__core"></span>
        </div>

        <div v-if="power >= 3" class="boom__pillar">
          <span class="boom__column"></span>
          <span class="boom__column boom__column--inner"></span>
          <span class="boom__cap"></span>
        </div>

        <div class="boom__ground">
          <span class="boom__ground-wave"></span>
        </div>

        <div class="boom__shockwaves">
          <span
            v-for="i in shockCount"
            :key="`shock-${i}`"
            class="boom__shockwave"
            :style="shockStyle(i)"
          ></span>
        </div>

        <div class="boom__debris">
          <span
            v-for="n in shardCount"
            :key="`shard-${n}`"
            class="boom__shard"
            :style="shardStyle(n)"
          ></span>
        </div>

        <div class="boom__sparks">
          <span
            v-for="n in sparkCount"
            :key="`spark-${n}`"
            class="boom__spark"
            :style="sparkStyle(n)"
          ></span>
        </div>

        <div class="boom__content">
          <span class="boom__kicker">{{ kickerText }}</span>
          <span
            class="boom__title"
            :class="{ 'boom__title--long': kind === 'bombStraight' }"
          >
            {{ titleText }}
          </span>
          <span class="boom__flourish"></span>
          <span class="boom__sub">{{ subText }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  kind: "bombStraight" | "kingBomb" | null;
  length?: number;
}>();

const CN_NUM = ["", "", "二", "三", "四", "五", "六", "七", "八", "九"];

const SHARD_SHAPES = [
  "polygon(0% 50%, 30% 0%, 100% 25%, 80% 100%, 20% 85%)",
  "polygon(50% 0%, 100% 40%, 70% 100%, 0% 70%)",
  "polygon(0% 20%, 60% 0%, 100% 60%, 55% 100%, 10% 80%)",
  "polygon(20% 0%, 100% 20%, 85% 100%, 0% 75%)",
];

function rnd(n: number, seed: number): number {
  return ((n * seed * 37) % 997) / 997;
}

const chain = computed(() =>
  props.kind === "kingBomb"
    ? 2
    : Math.max(2, Math.round((props.length ?? 8) / 4)),
);

const power = computed(() => (props.kind === "kingBomb" ? 5 : chain.value));
const level = computed(() => Math.min(5, power.value));

const shockCount = computed(() =>
  props.kind === "kingBomb" ? 4 : Math.min(6, chain.value + 1),
);

const sparkCount = computed(() => 22 + power.value * 13);
const shardCount = computed(() => 14 + power.value * 8);
const smokeCount = computed(() => 12 + power.value * 6);

const titleText = computed(() => {
  if (props.kind === "kingBomb") return "王 炸";
  return `${CN_NUM[chain.value] ?? chain.value}连炸`;
});

const kickerText = computed(() =>
  props.kind === "kingBomb" ? "ROCKET" : `CHAIN BOMB ×${chain.value}`,
);

const subText = computed(() =>
  props.kind === "kingBomb"
    ? "大小王 · 通杀全场"
    : `${props.length ?? 0} 张 · 倍数 ×${2 ** chain.value}`,
);

const rootStyle = computed<CSSProperties>(
  () =>
    ({
      "--shake": `${3 + power.value * 2}px`,
      "--fire-size": `${26 + power.value * 6}vmin`,
      "--flash-dur": `${(0.2 + power.value * 0.015).toFixed(2)}s`,
      "--fx-dur": `${(0.46 + power.value * 0.035).toFixed(2)}s`,
      "--ring-end": `${(2.4 + power.value * 0.55).toFixed(2)}`,
      "--ground-end": `${(4 + power.value * 0.8).toFixed(2)}`,
    }) as CSSProperties,
);

function shockStyle(i: number): CSSProperties {
  return {
    animationDelay: `${((i - 1) * 0.07).toFixed(2)}s`,
    animationDuration: `${(0.5 + power.value * 0.06).toFixed(2)}s`,
    borderWidth: `${6 + Math.max(0, power.value - i + 2)}px`,
  } as CSSProperties;
}

function shardStyle(n: number): CSSProperties {
  const total = shardCount.value;
  const angle = (n / total) * Math.PI * 2 + rnd(n, 5) * 0.55;
  const dist = 90 + rnd(n, 9) * (150 + power.value * 34);
  const sx = Math.cos(angle) * dist;
  const sy =
    Math.sin(angle) * dist * 0.55 + 70 + rnd(n, 15) * (120 + power.value * 10);
  const spin = (n % 2 === 0 ? 1 : -1) * (220 + rnd(n, 21) * 640);
  const size = 7 + rnd(n, 25) * 12 + power.value * 1.6;
  return {
    "--sx": `${sx.toFixed(0)}px`,
    "--sy": `${sy.toFixed(0)}px`,
    "--spin": `${spin.toFixed(0)}deg`,
    width: `${size.toFixed(1)}px`,
    height: `${(size * (0.5 + rnd(n, 31) * 0.6)).toFixed(1)}px`,
    clipPath: SHARD_SHAPES[n % SHARD_SHAPES.length],
    animationDelay: `${(rnd(n, 3) * 0.08).toFixed(3)}s`,
    animationDuration: `${(0.55 + rnd(n, 33) * 0.45 + power.value * 0.02).toFixed(2)}s`,
  } as CSSProperties;
}

function sparkStyle(n: number): CSSProperties {
  const total = sparkCount.value;
  const angle = (n / total) * Math.PI * 2 + rnd(n, 7) * 0.4;
  const dist = 70 + rnd(n, 11) * (150 + power.value * 32);
  const len = 10 + rnd(n, 13) * 26 + power.value * 3;
  const thick = 1.6 + rnd(n, 17) * 1.8;
  return {
    "--rot": `${((angle * 180) / Math.PI).toFixed(1)}deg`,
    "--dist": `${dist.toFixed(0)}px`,
    width: `${len.toFixed(1)}px`,
    height: `${thick.toFixed(1)}px`,
    animationDelay: `${(rnd(n, 19) * 0.16).toFixed(3)}s`,
    animationDuration: `${(0.4 + rnd(n, 23) * 0.4 + power.value * 0.03).toFixed(2)}s`,
  } as CSSProperties;
}

function smokeStyle(n: number): CSSProperties {
  const total = smokeCount.value;
  const angle = (n / total) * Math.PI * 2 + rnd(n, 6) * 0.7;
  const dist = 30 + rnd(n, 12) * (110 + power.value * 22);
  const sx = Math.cos(angle) * dist * 1.25;
  const sy =
    Math.sin(angle) * dist * 0.6 - (30 + rnd(n, 18) * 80) - power.value * 8;
  const size = 46 + rnd(n, 24) * 62 + power.value * 12;
  const scale = 1.7 + rnd(n, 28) * 1.3 + power.value * 0.16;
  return {
    "--sx": `${sx.toFixed(0)}px`,
    "--sy": `${sy.toFixed(0)}px`,
    "--scale": scale.toFixed(2),
    width: `${size.toFixed(0)}px`,
    height: `${size.toFixed(0)}px`,
    marginLeft: `${(-size / 2).toFixed(0)}px`,
    marginTop: `${(-size / 2).toFixed(0)}px`,
    animationDelay: `${(0.08 + rnd(n, 34) * 0.32).toFixed(2)}s`,
    animationDuration: `${(0.95 + rnd(n, 38) * 0.7 + power.value * 0.05).toFixed(2)}s`,
  } as CSSProperties;
}
</script>

<style scoped>
.boom {
  position: fixed;
  inset: 0;
  z-index: 108;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 46%,
    rgba(14, 4, 0, 0) 0%,
    rgba(10, 2, 0, 0.3) 60%,
    rgba(0, 0, 0, 0.52) 100%
  );
}

.boom__stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  animation: boom-shake var(--fx-dur) cubic-bezier(0.36, 0.07, 0.19, 0.97);
  will-change: transform;
}

.boom__flash {
  position: absolute;
  inset: 0;
  z-index: 8;
  background: radial-gradient(
    circle at 50% 45%,
    #ffffff 0%,
    #fff6dc 12%,
    rgba(255, 214, 120, 0.9) 26%,
    rgba(255, 132, 42, 0.4) 46%,
    transparent 70%
  );
  mix-blend-mode: screen;
  opacity: 0;
  animation: boom-flash var(--flash-dur) ease-out forwards;
}

.boom__flash--late {
  background: radial-gradient(
    circle at 50% 45%,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 226, 150, 0.7) 18%,
    rgba(255, 110, 40, 0.35) 38%,
    transparent 62%
  );
  animation-delay: 0.24s;
  animation-duration: 0.24s;
}

.boom--kingBomb .boom__flash {
  background: radial-gradient(
    circle at 50% 45%,
    #ffffff 0%,
    #fffbe6 12%,
    rgba(255, 226, 150, 0.9) 26%,
    rgba(255, 190, 80, 0.45) 48%,
    transparent 72%
  );
}

.boom__smoke {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 2;
}

.boom__smoke-puff {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 42% 36%,
    rgba(130, 118, 110, 0.55) 0%,
    rgba(70, 62, 58, 0.58) 42%,
    rgba(28, 23, 21, 0.48) 68%,
    transparent 78%
  );
  filter: blur(7px);
  opacity: 0;
  animation-name: boom-smoke;
  animation-timing-function: cubic-bezier(0.2, 0.7, 0.35, 1);
  animation-fill-mode: forwards;
}

.boom__smoke-puff:nth-child(3n) {
  background: radial-gradient(
    circle at 48% 42%,
    rgba(150, 104, 70, 0.5) 0%,
    rgba(86, 60, 44, 0.52) 44%,
    rgba(30, 22, 18, 0.44) 70%,
    transparent 80%
  );
}

.boom__fireball {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 3;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
}

.boom__blob {
  grid-area: 1 / 1;
  width: var(--fire-size);
  height: var(--fire-size);
  border-radius: 50%;
  mix-blend-mode: screen;
  filter: blur(3px);
  opacity: 0;
  animation: boom-fire 0.85s cubic-bezier(0.16, 0.84, 0.32, 1) forwards;
}

.boom__blob--1 {
  background: radial-gradient(
    circle at 46% 44%,
    #fffaf0 0%,
    #ffe89a 20%,
    #ffc23a 42%,
    rgba(255, 110, 24, 0.7) 60%,
    rgba(196, 42, 6, 0.4) 72%,
    transparent 80%
  );
}

.boom__blob--2 {
  width: calc(var(--fire-size) * 0.82);
  height: calc(var(--fire-size) * 0.82);
  background: radial-gradient(
    circle at 56% 50%,
    rgba(255, 246, 214, 0.98) 0%,
    #ffd35e 28%,
    rgba(255, 138, 30, 0.72) 56%,
    rgba(214, 54, 10, 0.32) 72%,
    transparent 80%
  );
  animation-delay: 0.045s;
}

.boom__blob--3 {
  width: calc(var(--fire-size) * 0.68);
  height: calc(var(--fire-size) * 0.68);
  background: radial-gradient(
    circle at 40% 58%,
    #fff2c4 0%,
    rgba(255, 190, 60, 0.9) 26%,
    rgba(255, 76, 18, 0.62) 56%,
    transparent 78%
  );
  animation-delay: 0.09s;
}

.boom--kingBomb .boom__blob--1 {
  background: radial-gradient(
    circle at 46% 44%,
    #ffffff 0%,
    #fff6da 20%,
    #ffe08a 42%,
    rgba(255, 150, 60, 0.7) 60%,
    rgba(255, 70, 60, 0.35) 74%,
    transparent 82%
  );
}

.boom__core {
  grid-area: 1 / 1;
  width: calc(var(--fire-size) * 0.55);
  height: calc(var(--fire-size) * 0.55);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #ffffff 0%,
    #fffdf0 30%,
    #ffe08a 52%,
    rgba(255, 150, 50, 0.5) 70%,
    transparent 78%
  );
  filter: blur(1.5px);
  mix-blend-mode: screen;
  opacity: 0;
  animation: boom-core 0.6s ease-out forwards;
}

.boom__pillar {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 2;
}

.boom__column {
  position: absolute;
  left: 50%;
  top: calc(var(--fire-size) * -1.7);
  width: calc(var(--fire-size) * 0.5);
  height: calc(var(--fire-size) * 1.7);
  margin-left: calc(var(--fire-size) * -0.25);
  border-radius: 50% 50% 40% 40%;
  background: linear-gradient(
    0deg,
    rgba(255, 242, 190, 0.95) 0%,
    rgba(255, 168, 54, 0.7) 34%,
    rgba(255, 84, 20, 0.35) 64%,
    transparent 100%
  );
  filter: blur(10px);
  transform-origin: 50% 100%;
  mix-blend-mode: screen;
  opacity: 0;
  animation: boom-column 1s cubic-bezier(0.2, 0.8, 0.3, 1) 0.06s forwards;
}

.boom__column--inner {
  width: calc(var(--fire-size) * 0.24);
  height: calc(var(--fire-size) * 1.4);
  margin-left: calc(var(--fire-size) * -0.12);
  background: linear-gradient(
    0deg,
    #ffffff 0%,
    rgba(255, 214, 100, 0.85) 45%,
    transparent 100%
  );
  filter: blur(5px);
  animation-delay: 0.1s;
}

.boom__cap {
  position: absolute;
  left: 50%;
  top: 0;
  width: calc(var(--fire-size) * 1.15);
  height: calc(var(--fire-size) * 0.7);
  margin-left: calc(var(--fire-size) * -0.575);
  margin-top: calc(var(--fire-size) * -1.95);
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 62%,
    rgba(96, 84, 78, 0.55) 0%,
    rgba(44, 36, 32, 0.45) 55%,
    transparent 76%
  );
  filter: blur(12px);
  opacity: 0;
  animation: boom-cap 1.1s ease-out 0.08s forwards;
}

.boom__ground {
  position: absolute;
  left: 50%;
  top: 70%;
  z-index: 2;
}

.boom__ground-wave {
  position: absolute;
  left: 0;
  top: 0;
  width: 40vmin;
  height: 40vmin;
  margin-left: -20vmin;
  margin-top: -20vmin;
  border-radius: 50%;
  border: 8px solid rgba(255, 214, 150, 0.5);
  box-shadow: 0 0 30px rgba(255, 170, 80, 0.4),
    inset 0 0 26px rgba(255, 150, 60, 0.35);
  filter: blur(3px);
  opacity: 0;
  animation: boom-ground 0.78s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
}

.boom__shockwaves {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 4;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
}

.boom__shockwave {
  grid-area: 1 / 1;
  width: 26vmin;
  height: 26vmin;
  border-radius: 50%;
  border-style: solid;
  border-color: rgba(255, 226, 152, 0.9);
  box-shadow: 0 0 26px rgba(255, 172, 72, 0.8),
    inset 0 0 22px rgba(255, 150, 60, 0.6);
  opacity: 0;
  animation-name: boom-ring;
  animation-timing-function: cubic-bezier(0.18, 0.8, 0.28, 1);
  animation-fill-mode: forwards;
}

.boom__shockwave:nth-child(even) {
  border-color: rgba(255, 138, 70, 0.85);
}

.boom--kingBomb .boom__shockwave {
  border-color: rgba(255, 248, 220, 0.92);
  box-shadow: 0 0 30px rgba(255, 226, 150, 0.85),
    inset 0 0 24px rgba(255, 200, 100, 0.6);
}

.boom__debris,
.boom__sparks {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 5;
}

.boom__shard {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 2px;
  background: linear-gradient(135deg, #574a3f 0%, #2b221b 55%, #17110c 100%);
  box-shadow: inset 0 0 4px rgba(255, 168, 70, 0.9),
    0 0 7px rgba(255, 120, 40, 0.5);
  opacity: 0;
  animation-name: boom-shard;
  animation-timing-function: cubic-bezier(0.18, 0.7, 0.3, 1);
  animation-fill-mode: forwards;
}

.boom__spark {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 50%;
  border-radius: 999px;
  background: linear-gradient(90deg, #fffdf0 0%, #ffcf5c 45%, #ff5a12 100%);
  box-shadow: 0 0 10px rgba(255, 170, 60, 0.9);
  opacity: 0;
  animation-name: boom-spark;
  animation-timing-function: cubic-bezier(0.14, 0.7, 0.3, 1);
  animation-fill-mode: forwards;
}

.boom__content {
  position: relative;
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px;
  text-align: center;
  animation: boom-content-in 0.62s cubic-bezier(0.18, 1.4, 0.36, 1) 0.08s both;
}

.boom__kicker {
  font-size: clamp(11px, 3vw, 15px);
  font-weight: 800;
  letter-spacing: 0.62em;
  text-indent: 0.62em;
  color: rgba(255, 233, 190, 0.82);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
}

.boom__title {
  font-family: "STKaiti", "KaiTi", "Songti SC", "Noto Serif SC", serif;
  font-size: clamp(76px, 22vw, 172px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  white-space: nowrap;
  background: linear-gradient(
    180deg,
    #fffef7 0%,
    #fff2c0 18%,
    #ffd24a 42%,
    #ff8a1e 68%,
    #d0310a 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(64, 12, 0, 0.35);
  filter: drop-shadow(0 0 22px rgba(255, 180, 70, 0.65))
    drop-shadow(0 10px 26px rgba(0, 0, 0, 0.6));
  animation: boom-title-glow 0.9s ease-in-out infinite;
}

.boom__title--long {
  font-size: clamp(50px, 15.5vw, 118px);
  letter-spacing: 0.08em;
  text-indent: 0.08em;
}

.boom--kingBomb .boom__title {
  background: linear-gradient(
    180deg,
    #ffffff 0%,
    #fff6da 18%,
    #ffe08a 42%,
    #ffb04a 66%,
    #ff4d5e 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
}

.boom__flourish {
  width: clamp(150px, 44vw, 320px);
  height: 2px;
  margin: 6px 0 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 180, 80, 0.25),
    rgba(255, 236, 170, 0.98),
    rgba(255, 180, 80, 0.25),
    transparent
  );
  box-shadow: 0 0 18px rgba(255, 170, 70, 0.7);
}

.boom__sub {
  font-size: clamp(12px, 3.4vw, 17px);
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(255, 240, 215, 0.85);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
}

@keyframes boom-flash {
  0% {
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  34% {
    opacity: 0.88;
  }
  100% {
    opacity: 0;
  }
}

@keyframes boom-fire {
  0% {
    transform: scale(0.04) rotate(-8deg);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  40% {
    transform: scale(0.92) rotate(6deg);
    opacity: 1;
  }
  64% {
    transform: scale(1.12) rotate(12deg);
    opacity: 0.95;
  }
  100% {
    transform: scale(1.75) rotate(22deg);
    opacity: 0;
  }
}

@keyframes boom-core {
  0% {
    transform: scale(0.1);
    opacity: 1;
  }
  30% {
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

@keyframes boom-ring {
  0% {
    transform: scale(0.1);
    opacity: 1;
  }
  100% {
    transform: scale(var(--ring-end));
    opacity: 0;
  }
}

@keyframes boom-ground {
  0% {
    transform: scale(0.15, 0.04);
    opacity: 0.9;
  }
  100% {
    transform: scale(var(--ground-end), 0.75);
    opacity: 0;
  }
}

@keyframes boom-column {
  0% {
    transform: scale(0.2, 0.05);
    opacity: 0;
  }
  18% {
    opacity: 0.95;
  }
  100% {
    transform: scale(1.05, 1.1);
    opacity: 0;
  }
}

@keyframes boom-cap {
  0% {
    transform: translateY(30%) scale(0.4);
    opacity: 0;
  }
  25% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(-90%) scale(1.6);
    opacity: 0;
  }
}

@keyframes boom-shard {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(0.5);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  55% {
    transform: translate(calc(var(--sx) * 0.6), calc(var(--sy) * 0.35 - 40px))
      rotate(calc(var(--spin) * 0.5)) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--sx), var(--sy)) rotate(var(--spin)) scale(0.4);
    opacity: 0;
  }
}

@keyframes boom-spark {
  0% {
    transform: rotate(var(--rot)) translateX(0) scaleX(0.2);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: rotate(var(--rot)) translateX(var(--dist)) scaleX(0.05);
    opacity: 0;
  }
}

@keyframes boom-smoke {
  0% {
    transform: translate(0, 0) scale(0.3);
    opacity: 0;
  }
  18% {
    opacity: 0.55;
  }
  70% {
    opacity: 0.4;
  }
  100% {
    transform: translate(var(--sx), var(--sy)) scale(var(--scale));
    opacity: 0;
  }
}

@keyframes boom-content-in {
  0% {
    opacity: 0;
    transform: scale(2.1);
    filter: blur(10px);
  }
  55% {
    opacity: 1;
    transform: scale(0.94);
    filter: blur(0);
  }
  72% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes boom-title-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 20px rgba(255, 180, 70, 0.55))
      drop-shadow(0 10px 26px rgba(0, 0, 0, 0.55));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(255, 210, 110, 0.95))
      drop-shadow(0 12px 30px rgba(0, 0, 0, 0.6));
  }
}

@keyframes boom-shake {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  10% {
    transform: translate(calc(var(--shake) * -1), calc(var(--shake) * 0.7))
      rotate(-0.4deg);
  }
  22% {
    transform: translate(var(--shake), calc(var(--shake) * -0.8)) rotate(0.5deg);
  }
  36% {
    transform: translate(
        calc(var(--shake) * -0.85),
        calc(var(--shake) * -0.55)
      )
      rotate(-0.35deg);
  }
  50% {
    transform: translate(calc(var(--shake) * 0.8), calc(var(--shake) * 0.6))
      rotate(0.3deg);
  }
  66% {
    transform: translate(calc(var(--shake) * -0.55), calc(var(--shake) * 0.4))
      rotate(-0.2deg);
  }
  82% {
    transform: translate(calc(var(--shake) * 0.4), calc(var(--shake) * -0.25))
      rotate(0.15deg);
  }
}

.boom-fade-leave-active {
  transition: opacity 0.34s ease;
}

.boom-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .boom__stage,
  .boom__flash,
  .boom__core,
  .boom__blob,
  .boom__column,
  .boom__cap,
  .boom__ground-wave,
  .boom__shockwave,
  .boom__shard,
  .boom__spark,
  .boom__smoke-puff,
  .boom__title,
  .boom__content {
    animation: none;
  }

  .boom__flash,
  .boom__core,
  .boom__blob,
  .boom__column,
  .boom__cap,
  .boom__ground-wave,
  .boom__shockwave,
  .boom__shard,
  .boom__spark,
  .boom__smoke-puff {
    opacity: 0;
  }
}
</style>
