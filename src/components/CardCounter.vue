<template>
  <div class="counter" title="记牌器：未打出且不在我手中的牌">
    <div class="counter__list">
      <div
        v-for="item in items"
        :key="item.rank"
        class="counter__cell"
        :class="{ 'counter__cell--out': item.left === 0 }"
      >
        <span
          class="counter__rank"
          :class="{ 'counter__rank--wide': item.rank >= 16 }"
        >
          {{ item.label }}
        </span>
        <span class="counter__num">{{ item.left }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "@/stores/game";
import { buildCardCounter } from "@/game/counter";

const game = useGameStore();

const items = computed(() =>
  buildCardCounter(game.playedCards, game.human.hand).reverse(),
);
</script>

<style scoped>
.counter {
  min-width: 0;
}

.counter__list {
  display: flex;
  justify-content: center;
  gap: 1px 2px;
}

.counter__cell {
  width: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.counter__rank {
  font-size: 8.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.52);
}

.counter__rank--wide {
  font-size: 7.5px;
  letter-spacing: -0.06em;
}

.counter__num {
  margin-top: 1px;
  font-size: 10px;
  font-weight: 900;
  color: #ffd75e;
  font-variant-numeric: tabular-nums;
}

.counter__cell--out {
  opacity: 0.28;
}

.counter__cell--out .counter__num {
  color: rgba(255, 255, 255, 0.75);
}

@media (max-width: 600px) {
  .counter__list {
    gap: 1px;
  }

  .counter__cell {
    width: 16px;
  }

  .counter__rank {
    font-size: 8px;
  }

  .counter__rank--wide {
    font-size: 7px;
  }

  .counter__num {
    font-size: 9.5px;
  }
}

@media (max-width: 480px) {
  .counter__list {
    display: grid;
    grid-template-columns: repeat(8, 16px);
    gap: 1px;
  }
}
</style>
