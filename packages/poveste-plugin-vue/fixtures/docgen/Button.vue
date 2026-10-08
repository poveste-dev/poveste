<script setup lang="ts">
import type { ButtonProps } from './button'

withDefaults(defineProps<ButtonProps>(), { size: 'md', level: 2 })

defineEmits<{
  press: [event: MouseEvent]
}>()

defineSlots<{
  /** Shown before the label. */
  icon: () => any
}>()
</script>

<template>
  <button><slot name="icon" />{{ label }}</button>
</template>
