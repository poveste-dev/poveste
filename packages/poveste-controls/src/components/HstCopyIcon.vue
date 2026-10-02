<script lang="ts">
export default {
  name: 'HstCopyIcon',
}
</script>

<script lang="ts" setup>
import type { Awaitable } from '@poveste/shared'
import { Icon } from '@iconify/vue'
import { useClipboard, useLiveAnnouncer, useTimeoutFn } from '@vueuse/core'
import { ref } from 'vue'
import HstTooltip from './HstTooltip.vue'

const props = defineProps<{
  content: string | undefined | (() => Awaitable<string | undefined>)
}>()

const { copy, copied } = useClipboard()
// The tooltip is the only other sign a copy worked, and a screen reader does not
// hear a tooltip change (#827).
const { polite } = useLiveAnnouncer()

// `copy` skips an empty value without a word, leaving the clipboard holding
// whatever was copied before — which then pastes as if it came from here (#1108).
const empty = ref(false)
const { start: clearEmpty } = useTimeoutFn(() => {
  empty.value = false
}, 1500, { immediate: false })

async function action() {
  const content = typeof props.content === 'function' ? await props.content() : props.content
  if (!content) {
    empty.value = true
    clearEmpty()
    polite('Nothing to copy')
    return
  }
  empty.value = false
  await copy(content)
  if (copied.value) {
    polite('Copied')
  }
}
</script>

<template>
  <HstTooltip
    :content="empty ? 'Nothing to copy' : 'Copied!'"
    :open="copied || empty"
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
