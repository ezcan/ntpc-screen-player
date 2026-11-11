<script setup lang="ts">
defineProps<{ paused: boolean }>()
</script>

<template>
  <!-- Kept outside the exhibit transition so changing units never resets the lights. -->
  <div class="ambient-layer" :class="{ 'is-ambient-paused': paused }" aria-hidden="true">
    <span v-for="light in 18" :key="light" class="bokeh-light"></span>
  </div>
</template>
