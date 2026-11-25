import { defineStore } from "pinia";
import { ref } from "vue";
import { getClearReason, type ClearReason } from "@/game/challenge";

const STORAGE_KEY = "doudizhu-clear-v1";

function loadCleared(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export const useChallengeStore = defineStore("challenge", () => {
  const cleared = ref(loadCleared());
  const celebrationOpen = ref(false);
  const reason = ref<ClearReason | null>(null);

  function evaluate(
    humanBalance: number,
    aiBankrupt: boolean,
  ): ClearReason | null {
    if (cleared.value) return null;
    const next = getClearReason(humanBalance, aiBankrupt);
    if (!next) return null;
    cleared.value = true;
    reason.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage 不可用时静默降级
    }
    return next;
  }

  function openCelebration(): void {
    if (cleared.value) celebrationOpen.value = true;
  }

  function closeCelebration(): void {
    celebrationOpen.value = false;
  }

  function reset(): void {
    cleared.value = false;
    celebrationOpen.value = false;
    reason.value = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage 不可用时静默降级
    }
  }

  return {
    cleared,
    celebrationOpen,
    reason,
    evaluate,
    openCelebration,
    closeCelebration,
    reset,
  };
});
