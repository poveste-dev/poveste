<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { nextTick, ref, watch } from 'vue'
import { onKeyboardShortcut } from '../../util/keyboard'
import LayoutPane from './LayoutPane.vue'

const props = defineProps({
  shown: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits({
  close: () => true,
})

function close() {
  emit('close')
}

onKeyboardShortcut(['escape'], () => {
  if (props.shown) {
    close()
  }
})

// A dialog to the keyboard as well: focus moves in when it opens, Tab stays inside,
// and closing hands focus back to whatever opened it, the layout chip or the page
// behind a shortcut. Focus used to stay on the chip, behind the pane (#1372).
const panel = ref<HTMLElement>()
let opener: HTMLElement | null = null

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function focusables() {
  return [...panel.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []]
    .filter(element => !element.hasAttribute('disabled') && element.getClientRects().length > 0)
}

watch(() => props.shown, async (shown) => {
  if (shown) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    focusables()[0]?.focus()
  }
  else if (opener?.isConnected) {
    opener.focus()
    opener = null
  }
})

function keepFocusInside(event: KeyboardEvent) {
  const elements = focusables()
  const first = elements[0]
  const last = elements.at(-1)
  if (!first || !last) {
    return
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div
    v-show="shown"
    class="poveste-layout-modal fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-20"
    data-testid="layout-modal"
  >
    <div
      class="absolute inset-0"
      @click="close()"
    />
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poveste-layout-modal-title"
      class="bg-white dark:bg-gray-900 md:mt-16 md:mx-auto w-screen max-w-[512px] shadow-xl border border-gray-200 dark:border-gray-750 rounded-lg relative divide-y divide-gray-200 dark:divide-gray-850"
      @keydown.tab="keepFocusInside"
    >
      <div class="flex items-center px-6 py-3 text-gray-900 dark:text-gray-100">
        <h2
          id="poveste-layout-modal-title"
          class="flex-1 text-sm font-medium m-0"
        >
          Customize Layout
        </h2>
        <button
          type="button"
          class="flex items-center justify-center p-1 bg-transparent border-0 text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer"
          aria-label="Close layout customization"
          data-testid="layout-modal-close"
          @click="close()"
        >
          <Icon
            icon="carbon:close"
            class="w-5 h-5"
            aria-hidden="true"
          />
        </button>
      </div>
      <LayoutPane />
    </div>
  </div>
</template>
