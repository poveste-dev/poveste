<script setup lang="ts">
defineProps<{
  /** The tab shown. */
  modelValue?: string
}>()

defineEmits<{
  /** A tab was chosen. */
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div><slot /></div>
</template>
