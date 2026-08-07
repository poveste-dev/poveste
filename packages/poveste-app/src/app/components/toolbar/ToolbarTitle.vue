<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

const props = defineProps<{
  variant?: Variant
  story?: Story
}>()

const icon = computed(() => props.variant?.icon ?? props.story?.icon ?? 'carbon:cube')
const iconColor = computed(() => props.variant?.iconColor ?? props.story?.iconColor)
const title = computed(() => props.variant?.title ?? props.story?.title ?? '')
const subtitle = computed(() => {
  if (props.variant && props.story && props.story.title !== props.variant.title) {
    return props.story.title
  }
  return undefined
})
</script>

<template>
  <div class="poveste-toolbar-title flex items-center gap-2 min-w-0">
    <Icon
      :icon="icon"
      class="w-4 h-4 flex-none"
      :class="[
        iconColor ? 'bind-icon-color' : 'text-gray-500 dark:text-gray-400',
      ]"
    />
    <div class="flex flex-col justify-center min-w-0 leading-tight text-center h-[2.25rem]">
      <span class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ title }}</span>
      <span
        v-if="subtitle"
        class="truncate text-xs text-gray-500 dark:text-gray-400"
      >{{ subtitle }}</span>
    </div>
  </div>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('iconColor');
}
</style>
