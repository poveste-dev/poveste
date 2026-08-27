<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <button class="vike-example-button">
    {{ label }}
  </button>
</template>
