import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { BANKRUPT_SUBSIDY, INITIAL_BEANS } from "@/game/rooms";

const STORAGE_KEY = "doudizhu-gold-v2";
const LEGACY_KEY = "doudizhu-gold-v1";
const PENDING_KEY = "doudizhu-subsidy-v1";
const UIDS = ["p0", "p1", "p2"];

function initialBeans(): Record<string, number> {
  const beans: Record<string, number> = {};
  for (const uid of UIDS) beans[uid] = INITIAL_BEANS[uid] ?? 0;
  return beans;
}

function loadBeans(): Record<string, number> {
  const beans = initialBeans();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const uid of UIDS) {
        const value = parsed[uid];
        if (typeof value === "number" && Number.isFinite(value)) {
          beans[uid] = Math.max(0, Math.round(value));
        }
      }
    }
  } catch {
    // 读取失败时使用默认余额
  }
  return beans;
}

function loadPending(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (uid): uid is string =>
            typeof uid === "string" && UIDS.includes(uid),
        );
      }
    }
  } catch {
    // 读取失败时忽略破产补助
  }
  return [];
}

export const useWalletStore = defineStore("wallet", () => {
  const beans = ref<Record<string, number>>(loadBeans());
  const pendingSubsidy = ref<string[]>(loadPending());

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(beans.value));
    } catch {
      // localStorage 不可用时静默降级
    }
  }

  function persistPending(): void {
    try {
      if (pendingSubsidy.value.length > 0) {
        localStorage.setItem(
          PENDING_KEY,
          JSON.stringify(pendingSubsidy.value),
        );
      } else {
        localStorage.removeItem(PENDING_KEY);
      }
    } catch {
      // localStorage 不可用时静默降级
    }
  }

  function get(uid: string): number {
    return Math.max(0, beans.value[uid] ?? INITIAL_BEANS[uid] ?? 0);
  }

  const activePendingSubsidy = computed(() =>
    pendingSubsidy.value.filter((uid) => get(uid) <= 0),
  );

  function prunePendingSubsidy(): void {
    if (activePendingSubsidy.value.length === pendingSubsidy.value.length) return;
    pendingSubsidy.value = [...activePendingSubsidy.value];
    persistPending();
  }

  function apply(deltas: Record<string, number>): void {
    for (const [uid, delta] of Object.entries(deltas)) {
      beans.value[uid] = Math.max(0, get(uid) + delta);
    }
    persist();
    prunePendingSubsidy();
  }

  function setAll(values: Record<string, number>): void {
    for (const uid of UIDS) {
      const value = values[uid];
      if (typeof value === "number" && Number.isFinite(value)) {
        beans.value[uid] = Math.max(0, Math.round(value));
      }
    }
    persist();
    prunePendingSubsidy();
  }

  function addPendingSubsidy(uids: string[]): void {
    if (uids.length === 0) return;
    const next = new Set(pendingSubsidy.value);
    for (const uid of uids) {
      if (UIDS.includes(uid)) next.add(uid);
    }
    pendingSubsidy.value = [...next];
    persistPending();
  }

  function hasPendingSubsidy(): boolean {
    return activePendingSubsidy.value.length > 0;
  }

  function applyPendingSubsidy(): string[] {
    const applied = [...activePendingSubsidy.value];
    for (const uid of applied) {
      beans.value[uid] = get(uid) + BANKRUPT_SUBSIDY;
    }
    pendingSubsidy.value = [];
    persist();
    persistPending();
    return applied;
  }

  function clearPendingSubsidy(): void {
    pendingSubsidy.value = [];
    persistPending();
  }

  function reset(): void {
    beans.value = initialBeans();
    pendingSubsidy.value = [];
    try {
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(PENDING_KEY);
    } catch {
      // 忽略
    }
    persist();
  }

  return {
    beans,
    pendingSubsidy,
    activePendingSubsidy,
    get,
    apply,
    setAll,
    addPendingSubsidy,
    hasPendingSubsidy,
    applyPendingSubsidy,
    clearPendingSubsidy,
    reset,
  };
});
