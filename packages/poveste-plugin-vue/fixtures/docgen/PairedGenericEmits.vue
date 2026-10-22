<script lang="ts">
export interface ToggleEmits<V> {
  /** Fired when the value changes. */
  'update:modelValue': [value: V]
}
</script>

<script setup lang="ts" generic="T = boolean">
defineProps<{ modelValue?: T }>()

defineEmits<ToggleEmits<T>>()
</script>

<template>
  <div />
</template>
