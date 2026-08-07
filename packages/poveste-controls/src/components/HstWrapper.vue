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
    class="poveste-wrapper histoire-wrapper p-2 hover:bg-primary-100 dark:hover:bg-primary-800 flex gap-2 flex-wrap"
  >
    <span
      v-tooltip="{
        content: title,
        placement: 'left',
        distance: 12,
      }"
      class="w-28 whitespace-nowrap text-ellipsis overflow-hidden shrink-0"
    >
      {{ title }}
    </span>
    <span class="grow max-w-full flex items-center gap-1">
      <span class="block grow max-w-full">
        <slot />
      </span>
      <slot name="actions" />
    </span>
  </component>
</template>
