<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { getSandboxUrl } from '../../util/sandbox'

const props = defineProps<{
  variant: Variant
  story: Story
}>()

const sandboxUrl = computed(() => {
  return getSandboxUrl(props.story, props.variant)
})
</script>

<template>
  <a
    v-tooltip="'Open variant in new tab'"
    :href="sandboxUrl"
    target="_blank"
    class="poveste-toolbar-new-tab ptw-flex ptw-items-center ptw-gap-1 ptw-h-full ptw-px-2 hover:ptw-text-primary-500 ptw-opacity-50 hover:ptw-opacity-100 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
  >
    <Icon
      icon="carbon:launch"
      class="ptw-w-4 ptw-h-4"
    />
  </a>
</template>
