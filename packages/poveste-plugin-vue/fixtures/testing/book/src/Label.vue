<script setup lang="ts">
import '@fontsource/fira-mono'

defineProps<{ text: string }>()
</script>

<template>
  <span class="label">{{ text }}</span>
</template>
