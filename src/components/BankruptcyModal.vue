<template>
  <transition name="modal">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="panel glass">
        <h2 class="panel__title">破产补助</h2>
        <p class="panel__hint">
          以下玩家余额为 $0，确认发放 ${{ formatBeans(BANKRUPT_SUBSIDY) }} 补助后开始下一局：
        </p>
        <ul class="players">
          <li v-for="uid in pending" :key="uid" class="players__item">
            <span class="players__name">{{ NAMES[uid] ?? uid }}</span>
            <span class="players__amount">$0</span>
          </li>
        </ul>
        <p class="panel__note">确认前不会发放补助</p>
        <div class="panel__actions">
          <button
            type="button"
            class="btn btn-ghost panel__btn"
            @click="$emit('close')"
          >
            稍后
          </button>
          <button
            type="button"
            class="btn btn-gold panel__btn"
            @click="$emit('confirm')"
          >
            确认发放
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { BANKRUPT_SUBSIDY, formatBeans } from "@/game/rooms";
import { useWalletStore } from "@/stores/wallet";

defineProps<{ open: boolean }>();
defineEmits<{ (e: "confirm"): void; (e: "close"): void }>();

const wallet = useWalletStore();
const pending = computed(() => wallet.pendingSubsidy);

const NAMES: Record<string, string> = {
  p0: "我",
  p1: "电脑小美",
  p2: "电脑老王",
};
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 95;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.64);
  backdrop-filter: blur(2px);
}

.panel {
  width: min(360px, 92vw);
  border-radius: 20px;
  padding: 24px 20px 18px;
}

.panel__title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  text-align: center;
  color: #ffe38a;
}

.panel__hint {
  margin: 10px 0 14px;
  font-size: 12.5px;
  line-height: 1.6;
  text-align: center;
  color: rgba(255, 255, 255, 0.66);
}

.players {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.players__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
}

.players__name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.players__amount {
  font-size: 15px;
  font-weight: 900;
  color: #ff9b9b;
  font-variant-numeric: tabular-nums;
}

.panel__note {
  margin: 12px 0 0;
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.42);
}

.panel__actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.panel__btn {
  flex: 1;
  height: 45px;
  font-size: 15px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
