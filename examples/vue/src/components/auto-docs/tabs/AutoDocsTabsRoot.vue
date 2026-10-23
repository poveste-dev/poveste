<script setup lang="ts">
const props = defineProps<{
  /** The tab shown. */
  modelValue?: string
}>()

defineEmits<{
  /** A tab was chosen. */
  'update:modelValue': [value: string]
}>()

defineSlots<{
  default?: (props: {
    /** The tab shown, for content that depends on it. */
    active: string
  }) => any
}>()
</script>

<template>
  <div><slot :active="props.modelValue ?? ''" /></div>
</template>
