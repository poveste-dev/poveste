<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div role="group">
    <div
      role="heading"
      aria-level="3"
      class="px-6 pt-3 pb-1 text-xs uppercase tracking-wide opacity-50"
    >
      {{ title }}
    </div>
    <slot />
  </div>
</template>
