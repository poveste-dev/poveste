<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps({
  icon: {
    type: String,
    default: 'carbon:cube',
  },
  title: {
    type: String,
    default: '',
  },
  count: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <div class="ptw-p-2 ptw-flex ptw-items-center ptw-gap-x-2">
    <Icon
      :icon="props.icon"
      class="ptw-text-2xl ptw-text-gray-700 dark:ptw-text-gray-300 ptw-flex-none"
    />
    <div class="ptw-flex ptw-flex-col ptw-leading-none">
      <span
        class="ptw-text-primary-500 ptw-min-w-[80px] ptw-font-bold"
      >
        {{ count }}
      </span>
      <span
        class="ptw-text-sm ptw-text-gray-900 dark:ptw-text-gray-100"
      >
        {{ title }}
      </span>
    </div>
  </div>
</template>
