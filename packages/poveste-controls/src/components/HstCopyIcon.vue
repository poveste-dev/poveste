<script lang="ts">
export default {
  name: 'HstCopyIcon',
}
</script>

<script lang="ts" setup>
import type { Awaitable } from '@poveste/shared'
import { Icon } from '@iconify/vue'
import { useClipboard } from '@vueuse/core'
import { VTooltip as vTooltip } from 'floating-vue'

const props = defineProps<{
  content: string | (() => Awaitable<string>)
}>()

const { copy, copied } = useClipboard()

async function action() {
  const content = typeof props.content === 'function' ? await props.content() : props.content
  copy(content)
}
</script>

<template>
  <Icon
    v-tooltip="{
      content: 'Copied!',
      triggers: [],
      shown: copied,
      distance: 12,
      delay: 0,
    }"
    icon="carbon:copy-file"
    class="ptw-w-4 ptw-h-4 ptw-opacity-50 hover:ptw-opacity-100 hover:ptw-text-primary-500 ptw-cursor-pointer"
    @click="action()"
  />
</template>
