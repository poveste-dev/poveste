<script setup lang="ts">
defineEmits<{
  /** Fired when the value changes. */
  change: [value: string]
  /**
   * Fired on close.
   * @deprecated use `change`
   */
  close: []
  open: []
}>()
</script>

<template>
  <div />
</template>
