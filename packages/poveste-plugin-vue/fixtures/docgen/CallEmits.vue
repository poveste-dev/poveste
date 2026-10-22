<script setup lang="ts">
defineEmits<{
  /** Fired when the value changes. */
  (event: 'change', value: string): void
  /**
   * Fired on close.
   * @deprecated use `change`
   */
  (event: 'close'): void
  (event: 'open'): void
}>()
</script>

<template>
  <div />
</template>
