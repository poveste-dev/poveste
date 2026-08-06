<script lang="ts" setup>
import type { HstEvent } from '../../stores/events'
import { computed } from 'vue'

const props = defineProps<{
  event: HstEvent
}>()

const formattedArgument = computed(() => {
  switch (typeof props.event.argument) {
    case 'string':
      return `"${props.event.argument}"`
    case 'object':
      return `{ ${Object.keys(props.event.argument).map(key => `${key}: ${props.event.argument[key]}`).join(', ')} }`
    default:
      return props.event.argument
  }
})
</script>

<template>
  <VDropdown
    class="poveste-story-event ptw-group"
    placement="right"
    data-test-id="event-item"
  >
    <template #default="{ shown }">
      <div
        class="group-hover:ptw-bg-primary-100 dark:group-hover:ptw-bg-primary-700 ptw-cursor-pointer ptw-py-2 ptw-px-4 ptw-flex ptw-items-baseline ptw-gap-1 ptw-leading-normal"
        :class="[
          shown ? 'ptw-bg-primary-50 dark:ptw-bg-primary-600' : 'group-odd:ptw-bg-gray-100/50 dark:group-odd:ptw-bg-gray-750/40',
        ]"
      >
        <span
          :class="{
            'ptw-text-primary-500': shown,
          }"
        >
          {{ event.name }}
        </span>
        <span
          v-if="event.argument"
          class="ptw-text-xs ptw-opacity-50 ptw-truncate"
        >{{ formattedArgument }}</span>
      </div>
    </template>

    <template #popper>
      <div class="ptw-overflow-auto ptw-max-w-[400px] ptw-max-h-[400px]">
        <pre class="ptw-p-4">{{ event.argument }}</pre>
      </div>
    </template>
  </VDropdown>
</template>
