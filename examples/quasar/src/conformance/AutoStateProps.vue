<script lang="ts" setup>
// Type-only, which is the idiom the Vue docs lead with — and the shape whose
// runtime types a production build erases (#490).
withDefaults(defineProps<{ name?: string }>(), { name: 'world' })
</script>

<template>
  Hello {{ name }}!
</template>
