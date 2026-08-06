<script lang="ts" setup>
import { Icon } from '@iconify/vue'

defineProps<{
  title: string
  opened: boolean
}>()

const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <transition name="__poveste-fade-bottom">
    <div
      v-if="opened"
      class="poveste-mobile-overlay ptw-absolute ptw-z-10 ptw-bg-white dark:ptw-bg-gray-700 ptw-w-screen ptw-h-screen ptw-inset-0 ptw-overflow-hidden ptw-flex ptw-flex-col"
    >
      <div class="ptw-p-4 ptw-h-16 ptw-flex ptw-border-b ptw-border-gray-100 dark:ptw-border-gray-800 ptw-items-center ptw-place-content-between">
        <span class="ptw-text-gray-500">{{ title }}</span>
        <a
          class="ptw-p-1 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-cursor-pointer"
          @click="emit('close')"
        >
          <Icon
            icon="carbon:close"
            class="ptw-w-8 ptw-h-8 ptw-shrink-0"
          />
        </a>
      </div>
      <slot />
    </div>
  </transition>
</template>
