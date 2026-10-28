<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  disabled?: boolean
}>(), {
  label: 'Click me',
})
</script>

<template>
  <button :disabled="disabled">
    {{ label }}
  </button>
</template>
