<script lang="ts" setup>
import { defineAsyncComponent } from 'vue'
import SearchLoading from './SearchLoading.vue'

const SearchPane = defineAsyncComponent({
  loader: () => import('./SearchPane.vue'),
  loadingComponent: SearchLoading,
  delay: 0,
})

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
</script>

<template>
  <div
    v-show="shown"
    class="poveste-search-modal ptw-fixed ptw-inset-0 ptw-bg-white/80 dark:ptw-bg-gray-900/80 ptw-z-20"
    data-test-id="search-modal"
  >
    <div
      class="ptw-absolute ptw-inset-0"
      @click="close()"
    />
    <div class="ptw-bg-white dark:ptw-bg-gray-900 md:ptw-mt-16 md:ptw-mx-auto ptw-w-screen ptw-max-w-[512px] ptw-shadow-xl ptw-border ptw-border-gray-200 dark:ptw-border-gray-750 ptw-rounded-lg ptw-relative ptw-divide-y ptw-divide-gray-200 dark:ptw-divide-gray-850">
      <SearchPane
        :shown="shown"
        @close="close()"
      />
    </div>
  </div>
</template>
