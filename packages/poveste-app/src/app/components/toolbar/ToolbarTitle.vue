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
  <div class="poveste-toolbar-title ptw-flex ptw-items-center ptw-gap-2 ptw-min-w-0">
    <Icon
      :icon="icon"
      class="ptw-w-4 ptw-h-4 ptw-flex-none"
      :class="[
        iconColor ? 'bind-icon-color' : 'ptw-text-gray-500 dark:ptw-text-gray-400',
      ]"
    />
    <div class="ptw-flex ptw-flex-col ptw-justify-center ptw-min-w-0 ptw-leading-tight ptw-text-center ptw-h-[2.25rem]">
      <span class="ptw-truncate ptw-text-sm ptw-font-medium ptw-text-gray-900 dark:ptw-text-gray-100">{{ title }}</span>
      <span
        v-if="subtitle"
        class="ptw-truncate ptw-text-xs ptw-text-gray-500 dark:ptw-text-gray-400"
      >{{ subtitle }}</span>
    </div>
  </div>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('iconColor');
}
</style>
