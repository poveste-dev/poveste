<script setup lang="ts">
defineProps<{
  /** The tab shown. */
  modelValue?: string
}>()
</script>

<template>
  <div><slot /></div>
</template>
