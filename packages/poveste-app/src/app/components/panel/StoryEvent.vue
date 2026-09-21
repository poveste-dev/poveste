<script lang="ts" setup>
import type { HstEvent } from '../../stores/events'
import { computed } from 'vue'
import BaseDropdown from '../base/BaseDropdown.vue'

const props = defineProps<{
  event: HstEvent
}>()

const formattedArgument = computed(() => {
  switch (typeof props.event.argument) {
    case 'string':
      return `"${props.event.argument}"`
    case 'object': {
      // `argument` is `unknown`, and `typeof x === 'object'` narrows it only as
      // far as `object | null` — enough for `Object.keys`, not for indexing.
      const argument = props.event.argument as Record<string, unknown> | null
      if (!argument) return 'null'
      return `{ ${Object.keys(argument).map(key => `${key}: ${argument[key]}`).join(', ')} }`
    }
    default:
      return props.event.argument
  }
})
</script>

<template>
  <BaseDropdown
    side="right"
    class="poveste-story-event group"
    data-testid="event-item"
  >
    <template #default="{ open }">
      <button
        class="group-hover:bg-primary-100 dark:group-hover:bg-primary-700 cursor-pointer py-2 px-4 w-full text-left flex items-baseline gap-1 leading-normal"
        :class="[
          open ? 'bg-primary-50 dark:bg-primary-600' : 'group-odd:bg-gray-100/50 dark:group-odd:bg-gray-750/40',
        ]"
      >
        <span
          :class="{
            'text-primary-500': open,
          }"
        >
          {{ event.name }}
        </span>
        <span
          v-if="event.argument"
          class="text-xs opacity-50 truncate"
        >{{ formattedArgument }}</span>
      </button>
    </template>

    <template #popper>
      <div class="overflow-auto max-w-[400px] max-h-[400px]">
        <pre class="p-4">{{ event.argument }}</pre>
      </div>
    </template>
  </BaseDropdown>
</template>
