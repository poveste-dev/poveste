<script setup lang="ts">
defineProps<{
  /** The tab this content belongs to. */
  value: string
}>()
</script>

<template>
  <div role="tabpanel">
    <slot />
  </div>
</template>
