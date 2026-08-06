<script lang="ts" setup>
import { defineAsyncComponent } from 'vue'
import { useCommandStore } from '../../stores/command.js'

const CommandPrompts = defineAsyncComponent(() => import('./CommandPrompts.vue'))

defineProps({
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

const commandStore = useCommandStore()
</script>

<template>
  <div
    v-if="shown"
    class="poveste-command-prompts-modal ptw-fixed ptw-inset-0 ptw-bg-white/80 dark:ptw-bg-gray-900/80 ptw-z-20"
  >
    <div
      class="ptw-absolute ptw-inset-0"
      @click="close()"
    />
    <div class="ptw-bg-white dark:ptw-bg-gray-900 md:ptw-mt-16 md:ptw-mx-auto ptw-w-screen ptw-max-w-[512px] ptw-max-h-[80vh] ptw-overflow-y-auto ptw-scroll-smooth ptw-shadow-xl ptw-border ptw-border-gray-200 dark:ptw-border-gray-750 ptw-rounded-lg ptw-relative ptw-divide-y ptw-divide-gray-200 dark:ptw-divide-gray-850">
      <CommandPrompts
        :command="commandStore.selectedCommand"
        @close="close()"
      />
    </div>
  </div>
</template>
