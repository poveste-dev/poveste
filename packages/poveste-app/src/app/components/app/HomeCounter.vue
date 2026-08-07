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
  <div class="p-2 flex items-center gap-x-2">
    <Icon
      :icon="props.icon"
      class="text-2xl text-gray-700 dark:text-gray-300 flex-none"
    />
    <div class="flex flex-col leading-none">
      <span
        class="text-primary-500 min-w-[80px] font-bold"
      >
        {{ count }}
      </span>
      <span
        class="text-sm text-gray-900 dark:text-gray-100"
      >
        {{ title }}
      </span>
    </div>
  </div>
</template>
