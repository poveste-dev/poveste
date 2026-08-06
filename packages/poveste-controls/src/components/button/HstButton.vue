<script lang="ts">
export default {
  name: 'HstButton',
}
</script>

<script setup lang="ts">
const colors = {
  default: 'ptw-bg-gray-200 dark:ptw-bg-gray-750 ptw-text-gray-900 dark:ptw-text-gray-100 hover:ptw-bg-primary-200 dark:hover:ptw-bg-primary-900',
  primary: 'ptw-bg-primary-500 hover:ptw-bg-primary-600 ptw-text-white dark:ptw-text-black',
  flat: 'ptw-bg-transparent hover:ptw-bg-gray-500/20 ptw-text-gray-900 dark:ptw-text-gray-100',
}

defineProps<{
  color?: keyof typeof colors
}>()
</script>

<template>
  <button
    class="poveste-button ptw-cursor-pointer ptw-rounded-sm ptw-border-none"
    :class="colors[color ?? 'default']"
  >
    <slot />
  </button>
</template>
