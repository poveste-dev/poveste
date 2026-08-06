<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useEventsStore } from '../../stores/events'
import BaseEmpty from '../base/BaseEmpty.vue'
import StoryEvent from './StoryEvent.vue'

const eventsStore = useEventsStore()

const hasEvents = computed(() => eventsStore.events.length)

onMounted(resetUnseen)
watch(() => eventsStore.unseen, resetUnseen)

async function resetUnseen() {
  if (eventsStore.unseen > 0) {
    eventsStore.unseen = 0
  }
  await nextTick()
  eventsElement.value.scrollTo({ top: eventsElement.value.scrollHeight })
}

const eventsElement = ref<HTMLDivElement>()
</script>

<template>
  <div
    ref="eventsElement"
    class="poveste-story-events"
  >
    <BaseEmpty
      v-if="!hasEvents"
    >
      <Icon
        icon="carbon:event-schedule"
        class="ptw-w-8 ptw-h-8 ptw-opacity-50 ptw-mb-6"
      />
      No event fired
    </BaseEmpty>
    <div v-else>
      <StoryEvent
        v-for="(event, key) of eventsStore.events"
        :key="key"
        :event="event"
      />
    </div>
  </div>
</template>
