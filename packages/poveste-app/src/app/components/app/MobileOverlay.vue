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
      class="poveste-mobile-overlay absolute z-10 bg-white dark:bg-gray-700 w-screen h-screen inset-0 overflow-hidden flex flex-col"
    >
      <div class="p-4 h-16 flex border-b border-gray-100 dark:border-gray-800 items-center place-content-between">
        <span class="text-gray-500">{{ title }}</span>
        <a
          class="p-1 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer"
          @click="emit('close')"
        >
          <Icon
            icon="carbon:close"
            class="w-8 h-8 shrink-0"
          />
        </a>
      </div>
      <slot />
    </div>
  </transition>
</template>
