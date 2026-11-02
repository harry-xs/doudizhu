<template>
  <div
    class="pcard"
    :class="[`pcard--${size}`, { 'pcard--red': red, 'pcard--selected': selected }]"
    role="img"
    :aria-label="cardText(card)"
  >
    <template v-if="isJoker">
      <span class="corner corner--tl">
        <span class="rank">{{ card.rank === 17 ? "大" : "小" }}</span>
        <span class="suit">王</span>
      </span>
      <span class="joker-star">★</span>
      <span class="joker-text">
        <span class="joker-char">{{ card.rank === 17 ? "大" : "小" }}</span>
        <span class="joker-char">王</span>
      </span>
      <span class="joker-star">★</span>
    </template>
    <template v-else>
      <span class="corner corner--tl">
        <span class="rank">{{ rankText }}</span>
        <span class="suit">{{ suitSymbol }}</span>
      </span>
      <span class="center-suit">{{ suitSymbol }}</span>
      <span class="corner corner--br" aria-hidden="true">
        <span class="rank">{{ rankText }}</span>
        <span class="suit">{{ suitSymbol }}</span>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Card } from "@/game/types";
import { cardText } from "@/game/rules";

const props = withDefaults(
  defineProps<{
    card: Card;
    size?: "md" | "sm" | "xs" | "tiny";
    selected?: boolean;
  }>(),
  { size: "md", selected: false },
);

const SUIT_SYMBOL: Record<string, string> = {
  spade: "♠",
  heart: "♥",
  club: "♣",
  diamond: "♦",
};

const isJoker = computed(() => props.card.suit === "joker");
const red = computed(
  () =>
    props.card.suit === "heart" ||
    props.card.suit === "diamond" ||
    props.card.rank === 17,
);
const suitSymbol = computed(() => SUIT_SYMBOL[props.card.suit] ?? "");
const rankText = computed(() => cardText(props.card));
</script>

<style scoped>
.pcard {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 5 / 7;
  padding: 0;
  border: none;
  border-radius: 9%;
  overflow: hidden;
  background: linear-gradient(155deg, #ffffff 0%, #f6f6f6 60%, #ececec 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.28), inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  color: #17181c;
  transition: transform 0.14s ease, box-shadow 0.14s ease;
  cursor: inherit;
}

.pcard--red {
  color: #d0242c;
}

.corner {
  position: absolute;
  left: 8%;
  top: 5%;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.corner--br {
  left: auto;
  right: 8%;
  top: auto;
  bottom: 5%;
  transform: rotate(180deg);
}

.rank {
  font-weight: 800;
  font-size: 1.12rem;
  letter-spacing: -0.02em;
}

.suit {
  font-size: 0.72rem;
  margin-top: 1px;
}

.center-suit {
  position: absolute;
  left: 50%;
  top: 52%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  opacity: 0.92;
}

.pcard--sm .rank {
  font-size: 0.82rem;
}
.pcard--sm .suit {
  font-size: 0.54rem;
}
.pcard--sm .center-suit {
  font-size: 1.4rem;
}

.pcard--xs {
  border-radius: 5px;
}
.pcard--xs .rank {
  font-size: 0.64rem;
}
.pcard--xs .suit {
  font-size: 0.4rem;
  margin-top: 0;
}
.pcard--xs .center-suit {
  font-size: 0.95rem;
}
.pcard--xs .corner {
  left: 7%;
  top: 5%;
}
.pcard--xs .corner--br {
  left: auto;
  right: 7%;
}

.pcard--tiny {
  border-radius: 4px;
}
.pcard--tiny .rank {
  font-size: 0.5rem;
}
.pcard--tiny .suit {
  font-size: 0.3rem;
  margin-top: 0;
}
.pcard--tiny .center-suit {
  font-size: 0.72rem;
}
.pcard--tiny .corner {
  left: 6%;
  top: 4%;
}
.pcard--tiny .corner--br {
  left: auto;
  right: 6%;
}

.joker-star {
  position: absolute;
  color: #d4af37;
  font-size: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
}

.joker-star:first-child {
  top: 8%;
}

.joker-star:last-child {
  bottom: 8%;
}

.joker-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.joker-char:last-child {
  color: #c0242c;
}

.pcard--red .joker-char:first-child {
  color: #c0242c;
}

.pcard--sm .joker-text {
  font-size: 1.05rem;
}
.pcard--xs .joker-text {
  font-size: 0.72rem;
}
.pcard--tiny .joker-text {
  font-size: 0.5rem;
}
.pcard--sm .joker-star {
  font-size: 0.42rem;
}
.pcard--xs .joker-star {
  font-size: 0.32rem;
}
.pcard--tiny .joker-star {
  font-size: 0.24rem;
}

.pcard--selected {
  box-shadow: 0 0 0 2px #ffd75e, 0 8px 18px rgba(0, 0, 0, 0.45);
}
</style>
