<script setup lang="ts">
// Named as the component beside it, with a different `size`: its types must not be the other's.
defineProps<{ size?: number }>()
</script>

<template>
  <span>size {{ size }}</span>
</template>
