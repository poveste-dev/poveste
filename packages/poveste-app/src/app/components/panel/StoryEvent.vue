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
    class="poveste-story-event group"
    placement="right"
    data-test-id="event-item"
  >
    <template #default="{ shown }">
      <div
        class="group-hover:bg-primary-100 dark:group-hover:bg-primary-700 cursor-pointer py-2 px-4 flex items-baseline gap-1 leading-normal"
        :class="[
          shown ? 'bg-primary-50 dark:bg-primary-600' : 'group-odd:bg-gray-100/50 dark:group-odd:bg-gray-750/40',
        ]"
      >
        <span
          :class="{
            'text-primary-500': shown,
          }"
        >
          {{ event.name }}
        </span>
        <span
          v-if="event.argument"
          class="text-xs opacity-50 truncate"
        >{{ formattedArgument }}</span>
      </div>
    </template>

    <template #popper>
      <div class="overflow-auto max-w-[400px] max-h-[400px]">
        <pre class="p-4">{{ event.argument }}</pre>
      </div>
    </template>
  </VDropdown>
</template>
