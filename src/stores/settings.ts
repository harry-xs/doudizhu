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
      };
    }
  } catch {
    // 读取失败时使用默认配置
  }
  return { sound: true, animation: true };
}

export const useSettingsStore = defineStore("settings", () => {
  const initial = loadSetting();
  const sound = ref(initial.sound);
  const animation = ref(initial.animation);

  function persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sound: sound.value, animation: animation.value }),
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

  return { sound, animation, toggleSound, toggleAnimation };
});
