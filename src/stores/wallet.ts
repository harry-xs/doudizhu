import { defineStore } from "pinia";
import { ref } from "vue";
import { DEFAULT_BEANS } from "@/game/rooms";

const STORAGE_KEY = "doudizhu-gold-v1";
const UIDS = ["p0", "p1", "p2"];

function loadBeans(): Record<string, number> {
  const beans: Record<string, number> = {};
  for (const uid of UIDS) beans[uid] = DEFAULT_BEANS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const uid of UIDS) {
        const value = parsed[uid];
        if (typeof value === "number" && Number.isFinite(value)) {
          beans[uid] = Math.round(value);
        }
      }
    }
  } catch {
    // 读取失败时使用默认金豆
  }
  return beans;
}

export const useWalletStore = defineStore("wallet", () => {
  const beans = ref<Record<string, number>>(loadBeans());

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(beans.value));
    } catch {
      // localStorage 不可用时静默降级
    }
  }

  function get(uid: string): number {
    return beans.value[uid] ?? DEFAULT_BEANS;
  }

  function apply(deltas: Record<string, number>): void {
    for (const [uid, delta] of Object.entries(deltas)) {
      beans.value[uid] = get(uid) + delta;
    }
    persist();
  }

  function setAll(values: Record<string, number>): void {
    for (const uid of UIDS) {
      const value = values[uid];
      if (typeof value === "number" && Number.isFinite(value)) {
        beans.value[uid] = Math.round(value);
      }
    }
    persist();
  }

  function reset(): void {
    const next: Record<string, number> = {};
    for (const uid of UIDS) next[uid] = DEFAULT_BEANS;
    beans.value = next;
    persist();
  }

  return { beans, get, apply, setAll, reset };
});
