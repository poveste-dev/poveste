<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <q-btn color="primary" :label="label" />
</template>
