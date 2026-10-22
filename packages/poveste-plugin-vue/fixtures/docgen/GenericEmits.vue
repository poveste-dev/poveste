<script setup lang="ts" generic="T">
defineProps<{ value: T }>()

defineEmits<{
  /** Fired when the value changes. */
  change: [value: T]
}>()
</script>

<template>
  <div />
</template>
