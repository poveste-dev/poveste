<script lang="ts">
export default {
  name: 'HstWrapper',
}
</script>

<script lang="ts" setup>
import HstTooltip from './HstTooltip.vue'

withDefaults(defineProps<{
  title?: string | undefined
  tag?: string | undefined
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
    <HstTooltip
      :content="title"
      side="left"
      :offset="12"
    >
      <span class="w-28 whitespace-nowrap text-ellipsis overflow-hidden shrink-0">
        {{ title }}
      </span>
    </HstTooltip>
    <span class="grow max-w-full flex items-center gap-1">
      <span class="block grow max-w-full">
        <slot />
      </span>
      <slot name="actions" />
    </span>
  </component>
</template>
