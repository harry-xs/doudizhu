<template>
  <transition name="modal">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="panel glass">
        <h2 class="panel__title">设置</h2>

        <div class="row">
          <div class="row__label">
            <span>游戏音效</span>
            <small>出牌、炸弹、胜负提示音</small>
          </div>
          <button
            type="button"
            class="switch"
            :class="{ 'switch--on': settings.sound }"
            :aria-pressed="settings.sound"
            @click="settings.toggleSound()"
          >
            <span class="switch__thumb"></span>
          </button>
        </div>

        <div class="row">
          <div class="row__label">
            <span>界面动画</span>
            <small>发牌、出牌与结算动效</small>
          </div>
          <button
            type="button"
            class="switch"
            :class="{ 'switch--on': settings.animation }"
            :aria-pressed="settings.animation"
            @click="settings.toggleAnimation()"
          >
            <span class="switch__thumb"></span>
          </button>
        </div>

        <button type="button" class="btn btn-primary panel__done" @click="$emit('close')">
          完 成
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";

defineProps<{ open: boolean }>();
defineEmits<{ (e: "close"): void }>();

const settings = useSettingsStore();
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
}

.panel {
  width: min(340px, 92vw);
  border-radius: 20px;
  padding: 22px 20px 18px;
}

.panel__title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  color: #fff;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.row__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
  font-weight: 600;
}

.row__label small {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
}

.switch {
  position: relative;
  width: 48px;
  height: 27px;
  flex: 0 0 auto;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.2s ease;
}

.switch--on {
  background: #2ba36d;
}

.switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;
}

.switch--on .switch__thumb {
  transform: translateX(21px);
}

.panel__done {
  width: 100%;
  margin-top: 18px;
  height: 44px;
  font-size: 16px;
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
