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
    class="poveste-command-prompts-modal fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-20"
  >
    <div
      class="absolute inset-0"
      @click="close()"
    />
    <div class="bg-white dark:bg-gray-900 md:mt-16 md:mx-auto w-screen max-w-[512px] max-h-[80vh] overflow-y-auto scroll-smooth shadow-xl border border-gray-200 dark:border-gray-750 rounded-lg relative divide-y divide-gray-200 dark:divide-gray-850">
      <CommandPrompts
        :command="commandStore.selectedCommand"
        @close="close()"
      />
    </div>
  </div>
</template>
