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
  /** The content is on its way, so an empty one is not yet "nothing" (#1314). */
  loading?: boolean
}>()

const { copy, copied } = useClipboard()
// The tooltip is the only other sign a copy worked, and a screen reader does not
// hear a tooltip change (#827).
const { polite } = useLiveAnnouncer()

// Said in place of a copy. `copy` skips an empty value without a word, leaving
// the clipboard holding whatever was copied before — which then pastes as if it
// came from here (#1108).
const notice = ref<string>()
const { start: clearNotice } = useTimeoutFn(() => {
  notice.value = undefined
}, 1500, { immediate: false })

function tell(message: string) {
  notice.value = message
  clearNotice()
  polite(message)
}

async function action() {
  if (props.loading) {
    tell('Still loading')
    return
  }
  const content = typeof props.content === 'function' ? await props.content() : props.content
  if (!content) {
    tell('Nothing to copy')
    return
  }
  notice.value = undefined
  await copy(content)
  if (copied.value) {
    polite('Copied')
  }
}
</script>

<template>
  <HstTooltip
    :content="notice ?? 'Copied!'"
    :open="copied || !!notice"
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
