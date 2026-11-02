<template>
  <div class="app-root" :class="{ 'reduce-motion': !settings.animation }">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();
</script>
