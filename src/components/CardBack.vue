<template>
  <div class="card-back" :class="`card-back--${size}`">
    <div class="card-back__inner"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: "md" | "sm" | "xs" }>(), { size: "sm" });
</script>

<style scoped>
.card-back {
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 9%;
  padding: 6%;
  background: linear-gradient(150deg, #f3e7c9, #d9c391);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}

.card-back__inner {
  width: 100%;
  height: 100%;
  border-radius: 6%;
  background-color: #8c1d2b;
  background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.16) 0px,
      rgba(255, 255, 255, 0.16) 1px,
      transparent 1px,
      transparent 5px
    ),
    repeating-linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.1) 0px,
      rgba(255, 255, 255, 0.1) 1px,
      transparent 1px,
      transparent 5px
    ),
    radial-gradient(circle at 50% 50%, #b3313f, #6f111d);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.18);
}

.card-back--xs {
  border-radius: 5px;
  padding: 5%;
}
</style>
