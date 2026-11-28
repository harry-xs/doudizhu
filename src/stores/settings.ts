import { defineStore } from "pinia";
import { ref } from "vue";
import type { AppSetting } from "@/game/types";
import { BEAN_BASE } from "@/game/rooms";

const STORAGE_KEY = "doudizhu-setting-v1";

function normalizeBaseBet(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return BEAN_BASE;
  return Math.max(1, Math.round(num));
}

function loadSetting(): AppSetting {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSetting>;
      return {
        sound: parsed.sound !== false,
        animation: parsed.animation !== false,
        counter: parsed.counter !== false,
        shuffle: parsed.shuffle !== false,
        baseBet: normalizeBaseBet(parsed.baseBet ?? BEAN_BASE),
      };
    }
  } catch {
    // 读取失败时使用默认配置
  }
  return {
    sound: true,
    animation: true,
    counter: true,
    shuffle: true,
    baseBet: BEAN_BASE,
  };
}

export const useSettingsStore = defineStore("settings", () => {
  const initial = loadSetting();
  const sound = ref(initial.sound);
  const animation = ref(initial.animation);
  const counter = ref(initial.counter);
  const shuffle = ref(initial.shuffle);
  const baseBet = ref(initial.baseBet);

  function persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sound: sound.value,
          animation: animation.value,
          counter: counter.value,
          shuffle: shuffle.value,
          baseBet: baseBet.value,
        }),
      );
    } catch {
      // localStorage 不可用时静默降级
    }
  }

  function setBaseBet(value: number): void {
    baseBet.value = normalizeBaseBet(value);
    persist();
  }

  function toggleSound(): void {
    sound.value = !sound.value;
    persist();
  }

  function toggleAnimation(): void {
    animation.value = !animation.value;
    persist();
  }

  function toggleCounter(): void {
    counter.value = !counter.value;
    persist();
  }

  function toggleShuffle(): void {
    shuffle.value = !shuffle.value;
    persist();
  }

  function reset(): void {
    sound.value = true;
    animation.value = true;
    counter.value = true;
    shuffle.value = true;
    baseBet.value = BEAN_BASE;
    persist();
  }

  return {
    sound,
    animation,
    counter,
    shuffle,
    baseBet,
    setBaseBet,
    toggleSound,
    toggleAnimation,
    toggleCounter,
    toggleShuffle,
    reset,
  };
});
