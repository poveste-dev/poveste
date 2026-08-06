<script lang="ts">
export default {
  name: 'HstWrapper',
}
</script>

<script lang="ts" setup>
import { VTooltip as vTooltip } from 'floating-vue'

withDefaults(defineProps<{
  title?: string
  tag?: string
}>(), {
  title: undefined,
  tag: 'label',
})
</script>

<template>
  <component
    :is="tag"
    class="poveste-wrapper histoire-wrapper ptw-p-2 hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-800 ptw-flex ptw-gap-2 ptw-flex-wrap"
  >
    <span
      v-tooltip="{
        content: title,
        placement: 'left',
        distance: 12,
      }"
      class="ptw-w-28 ptw-whitespace-nowrap ptw-text-ellipsis ptw-overflow-hidden ptw-shrink-0"
    >
      {{ title }}
    </span>
    <span class="ptw-grow ptw-max-w-full ptw-flex ptw-items-center ptw-gap-1">
      <span class="ptw-block ptw-grow ptw-max-w-full">
        <slot />
      </span>
      <slot name="actions" />
    </span>
  </component>
</template>
