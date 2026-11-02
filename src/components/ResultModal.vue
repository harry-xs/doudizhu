<template>
  <transition name="modal">
    <div v-if="show" class="overlay">
      <div class="panel glass" :class="won ? 'panel--win' : 'panel--lose'">
        <div class="panel__glow"></div>
        <div class="panel__badge">{{ won ? "胜利" : "失败" }}</div>
        <p class="panel__side">
          {{ side === "landlord" ? "地主获胜" : "农民获胜" }}
        </p>

        <div class="panel__stats">
          <div class="stat">
            <span class="stat__label">本局倍数</span>
            <span class="stat__value">×{{ multiple }}</span>
          </div>
          <div class="stat">
            <span class="stat__label">对局</span>
            <span class="stat__value">第 {{ round }} 局</span>
          </div>
        </div>

        <div class="panel__actions">
          <button type="button" class="btn btn-gold panel__btn" @click="$emit('restart')">
            再来一局
          </button>
          <button type="button" class="btn btn-ghost panel__btn" @click="$emit('home')">
            返回首页
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  won: boolean;
  side: "landlord" | "farmer" | null;
  multiple: number;
  round: number;
}>();

defineEmits<{ (e: "restart"): void; (e: "home"): void }>();
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(2px);
}

.panel {
  position: relative;
  width: min(350px, 92vw);
  border-radius: 24px;
  padding: 30px 24px 22px;
  text-align: center;
  overflow: hidden;
  animation: pop 0.32s cubic-bezier(0.2, 1.2, 0.4, 1);
}

.panel__glow {
  position: absolute;
  inset: -40% -10% auto;
  height: 180px;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.55;
  pointer-events: none;
}

.panel--win .panel__glow {
  background: radial-gradient(circle, #ffd75e, transparent 65%);
}

.panel--lose .panel__glow {
  background: radial-gradient(circle, #7f8c9b, transparent 65%);
}

.panel__badge {
  position: relative;
  font-size: 40px;
  font-weight: 900;
  letter-spacing: 0.12em;
  line-height: 1.1;
}

.panel--win .panel__badge {
  background: linear-gradient(180deg, #fff7d1, #ffd75e 40%, #b8860b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 4px 10px rgba(212, 175, 55, 0.4));
}

.panel--lose .panel__badge {
  color: #c9d2dc;
}

.panel__side {
  margin: 6px 0 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.72);
}

.panel__stats {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat__label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.stat__value {
  font-size: 20px;
  font-weight: 800;
  color: #ffd75e;
  font-variant-numeric: tabular-nums;
}

.panel__actions {
  display: flex;
  gap: 10px;
}

.panel__btn {
  flex: 1;
  height: 46px;
  font-size: 15px;
}

@keyframes pop {
  0% {
    opacity: 0;
    transform: scale(0.86) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
