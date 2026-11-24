<template>
  <transition name="modal">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="panel glass">
        <h2 class="panel__title">余额调整</h2>
        <p class="panel__hint">修改后立即保存到本地</p>

        <div v-for="item in items" :key="item.uid" class="row">
          <span class="row__name">{{ item.name }}</span>
          <div class="row__field">
            <span class="row__currency">$</span>
            <input
              v-model="values[item.uid]"
              class="row__input"
              type="number"
              inputmode="numeric"
              min="0"
              step="100"
            />
          </div>
        </div>

        <div class="panel__actions">
          <button
            type="button"
            class="btn btn-ghost panel__btn"
            @click="$emit('close')"
          >
            取消
          </button>
          <button type="button" class="btn btn-gold panel__btn" @click="save">
            保存
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useWalletStore } from "@/stores/wallet";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const wallet = useWalletStore();

const items = [
  { uid: "p0", name: "我" },
  { uid: "p1", name: "电脑小美" },
  { uid: "p2", name: "电脑老王" },
];

const values = ref<Record<string, number | string>>({
  p0: 0,
  p1: 0,
  p2: 0,
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    for (const item of items) {
      values.value[item.uid] = wallet.get(item.uid);
    }
  },
  { immediate: true },
);

function save(): void {
  const next: Record<string, number> = {};
  for (const item of items) {
    const raw = values.value[item.uid];
    const text = String(raw).trim();
    const num = text === "" ? wallet.get(item.uid) : Number(text);
    next[item.uid] = Number.isFinite(num)
      ? Math.max(0, Math.round(num))
      : wallet.get(item.uid);
  }
  wallet.setAll(next);
  emit("close");
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
}

.panel {
  width: min(340px, 92vw);
  border-radius: 20px;
  padding: 22px 20px 18px;
}

.panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  color: #fff;
}

.panel__hint {
  margin: 6px 0 16px;
  font-size: 11px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.row__name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.row__field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.row__currency {
  font-size: 15px;
  font-weight: 900;
  color: #ffd75e;
}

.row__input {
  width: 130px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(212, 175, 55, 0.35);
  background: rgba(0, 0, 0, 0.28);
  color: #ffe38a;
  font-size: 15px;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
  outline: none;
}

.row__input:focus {
  border-color: rgba(255, 215, 94, 0.75);
}

.panel__actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.panel__btn {
  flex: 1;
  height: 44px;
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
