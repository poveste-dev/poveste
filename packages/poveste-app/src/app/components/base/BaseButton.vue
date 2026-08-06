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
    class="poveste-base-button ptw-rounded ptw-cursor-pointer"
    :class="{
      'ptw-bg-primary-200 dark:ptw-bg-primary-800 hover:ptw-bg-primary-300 dark:hover:ptw-bg-primary-700': color === 'primary' || !color,
      'ptw-bg-grey-100 dark:ptw-bg-grey-900 hover:ptw-bg-grey-200 dark:hover:ptw-bg-grey-800': color === 'grey',
    }"
  >
    <slot />
  </component>
</template>
