<script lang="ts" setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  to?: any
  href?: string
  color?: string
}>()

const comp = computed(() => {
  if (props.to) {
    return RouterLink
  }
  if (props.href) {
    return 'a'
  }
  return 'button'
})
</script>

<template>
  <component
    :is="comp"
    class="poveste-base-button rounded cursor-pointer"
    :class="{
      'bg-primary-200 dark:bg-primary-800 hover:bg-primary-300 dark:hover:bg-primary-700': color === 'primary' || !color,
      'bg-grey-100 dark:bg-grey-900 hover:bg-grey-200 dark:hover:bg-grey-800': color === 'grey',
    }"
  >
    <slot />
  </component>
</template>
