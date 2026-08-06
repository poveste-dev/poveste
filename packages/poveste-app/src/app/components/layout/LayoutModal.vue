<script setup lang="ts">
import { Icon } from '@iconify/vue'
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
</script>

<template>
  <div
    v-show="shown"
    class="poveste-layout-modal ptw-fixed ptw-inset-0 ptw-bg-white/80 dark:ptw-bg-gray-900/80 ptw-z-20"
    data-test-id="layout-modal"
  >
    <div
      class="ptw-absolute ptw-inset-0"
      @click="close()"
    />
    <div class="ptw-bg-white dark:ptw-bg-gray-900 md:ptw-mt-16 md:ptw-mx-auto ptw-w-screen ptw-max-w-[512px] ptw-shadow-xl ptw-border ptw-border-gray-200 dark:ptw-border-gray-750 ptw-rounded-lg ptw-relative ptw-divide-y ptw-divide-gray-200 dark:ptw-divide-gray-850">
      <div class="ptw-flex ptw-items-center ptw-px-6 ptw-py-3 ptw-text-gray-900 dark:ptw-text-gray-100">
        <h2 class="ptw-flex-1 ptw-text-sm ptw-font-medium ptw-m-0">
          Customize Layout
        </h2>
        <button
          type="button"
          class="ptw-flex ptw-items-center ptw-justify-center ptw-p-1 ptw-bg-transparent ptw-border-0 ptw-text-gray-500 dark:ptw-text-gray-400 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer"
          aria-label="Close layout customization"
          data-test-id="layout-modal-close"
          @click="close()"
        >
          <Icon
            icon="carbon:close"
            class="ptw-w-5 ptw-h-5"
            aria-hidden="true"
          />
        </button>
      </div>
      <LayoutPane />
    </div>
  </div>
</template>
