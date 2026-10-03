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
  <button
    class="auto-docs-button"
    @click="$emit('press', $event)"
  >
    <slot name="icon" />{{ label }}
  </button>
</template>
