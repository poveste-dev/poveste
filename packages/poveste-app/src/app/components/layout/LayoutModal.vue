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
    class="poveste-layout-modal fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-20"
    data-testid="layout-modal"
  >
    <div
      class="absolute inset-0"
      @click="close()"
    />
    <div class="bg-white dark:bg-gray-900 md:mt-16 md:mx-auto w-screen max-w-[512px] shadow-xl border border-gray-200 dark:border-gray-750 rounded-lg relative divide-y divide-gray-200 dark:divide-gray-850">
      <div class="flex items-center px-6 py-3 text-gray-900 dark:text-gray-100">
        <h2 class="flex-1 text-sm font-medium m-0">
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
