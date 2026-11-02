<script setup lang="ts">
import '@fontsource/fira-mono'

defineProps<{ text: string }>()

// eslint-disable-next-line no-console
console.info('printed by a story')
</script>

<template>
  <span class="label">{{ text }}</span>
</template>
