<script setup lang="ts" generic="T extends string = string">
defineProps<{
  /** The tab this content belongs to. */
  value: T
}>()
</script>

<template>
  <div role="tabpanel">
    <slot />
  </div>
</template>
