<script lang="ts" setup>
import { defineAsyncComponent } from 'vue'
import SearchLoading from './SearchLoading.vue'

defineProps({
  shown: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits({
  close: () => true,
})

const SearchPane = defineAsyncComponent({
  loader: () => import('./SearchPane.vue'),
  loadingComponent: SearchLoading,
  delay: 0,
})

function close() {
  emit('close')
}
</script>

<template>
  <div
    v-show="shown"
    class="poveste-search-modal fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-20"
    data-test-id="search-modal"
  >
    <div
      class="absolute inset-0"
      @click="close()"
    />
    <div class="bg-white dark:bg-gray-900 md:mt-16 md:mx-auto w-screen max-w-[512px] shadow-xl border border-gray-200 dark:border-gray-750 rounded-lg relative divide-y divide-gray-200 dark:divide-gray-850">
      <SearchPane
        :shown="shown"
        @close="close()"
      />
    </div>
  </div>
</template>
