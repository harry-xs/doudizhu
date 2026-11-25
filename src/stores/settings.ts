import { defineStore } from "pinia";
import { ref } from "vue";
import type { AppSetting } from "@/game/types";

const STORAGE_KEY = "doudizhu-setting-v1";

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
      };
    }
  } catch {
    // 读取失败时使用默认配置
  }
  return { sound: true, animation: true, counter: true, shuffle: true };
}

export const useSettingsStore = defineStore("settings", () => {
  const initial = loadSetting();
  const sound = ref(initial.sound);
  const animation = ref(initial.animation);
  const counter = ref(initial.counter);
  const shuffle = ref(initial.shuffle);

  function persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sound: sound.value,
          animation: animation.value,
          counter: counter.value,
          shuffle: shuffle.value,
        }),
      );
    } catch {
      // localStorage 不可用时静默降级
    }
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
    persist();
  }

  return {
    sound,
    animation,
    counter,
    shuffle,
    toggleSound,
    toggleAnimation,
    toggleCounter,
    toggleShuffle,
    reset,
  };
});
