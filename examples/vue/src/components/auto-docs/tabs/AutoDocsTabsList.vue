<script setup lang="ts">
defineProps<{
  /** Whether arrow keys wrap from the last tab to the first. */
  loop?: boolean
}>()
</script>

<template>
  <div role="tablist">
    <slot />
  </div>
</template>
