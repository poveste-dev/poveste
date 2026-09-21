<script lang="ts">
export default {
  name: 'HstCopyIcon',
}
</script>

<script lang="ts" setup>
import type { Awaitable } from '@poveste/shared'
import { Icon } from '@iconify/vue'
import { useClipboard, useLiveAnnouncer } from '@vueuse/core'
import HstTooltip from './HstTooltip.vue'

const props = defineProps<{
  content: string | (() => Awaitable<string>)
}>()

const { copy, copied } = useClipboard()
// The tooltip is the only other sign a copy worked, and a screen reader does not
// hear a tooltip change (#827).
const { polite } = useLiveAnnouncer()

async function action() {
  const content = typeof props.content === 'function' ? await props.content() : props.content
  await copy(content)
  if (copied.value) {
    polite('Copied')
  }
}
</script>

<template>
  <HstTooltip
    content="Copied!"
    :open="copied"
    :offset="12"
  >
    <button
      type="button"
      aria-label="Copy"
      class="flex p-0 bg-transparent border-0 text-inherit opacity-50 hover:opacity-100 focus-visible:opacity-100 hover:text-primary-500 cursor-pointer"
      @click="action()"
    >
      <Icon
        icon="carbon:copy-file"
        class="w-4 h-4"
      />
    </button>
  </HstTooltip>
</template>
