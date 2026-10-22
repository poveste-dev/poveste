<script setup lang="ts">
defineProps<{
  /** The tab this trigger shows. */
  value: string
}>()
</script>

<template>
  <button role="tab">
    <slot />
  </button>
</template>
