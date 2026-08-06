<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div role="group">
    <div
      role="heading"
      aria-level="3"
      class="ptw-px-6 ptw-pt-3 ptw-pb-1 ptw-text-xs ptw-uppercase ptw-tracking-wide ptw-opacity-50"
    >
      {{ title }}
    </div>
    <slot />
  </div>
</template>
