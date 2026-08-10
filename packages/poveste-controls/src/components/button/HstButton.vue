<script lang="ts">
export default {
  name: 'HstButton',
}
</script>

<script setup lang="ts">
defineProps<{
  color?: keyof typeof colors
}>()

const colors = {
  default: 'bg-gray-200 dark:bg-gray-750 text-gray-900 dark:text-gray-100 hover:bg-primary-200 dark:hover:bg-primary-900',
  primary: 'bg-primary-500 hover:bg-primary-600 text-white dark:text-black',
  flat: 'bg-transparent hover:bg-gray-500/20 text-gray-900 dark:text-gray-100',
}
</script>

<template>
  <button
    class="poveste-button cursor-pointer rounded-sm border-none"
    :class="colors[color ?? 'default']"
  >
    <slot />
  </button>
</template>
