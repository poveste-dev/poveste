<script lang="ts" setup>
import { reactive } from 'vue'

const progress = reactive({
  loaded: 0,
  total: 0,
})

const maxCols = window.innerWidth / 20

if (import.meta.hot) {
  import.meta.hot.on('poveste:stories-loading-progress', (data) => {
    progress.loaded = data.loadedFileCount
    progress.total = data.totalFileCount
  })
}
</script>

<template>
  <div class="poveste-initial-loading ptw-fixed ptw-inset-0 ptw-bg-white dark:ptw-bg-gray-700 ptw-flex ptw-flex-col ptw-gap-6 ptw-items-center ptw-justify-center">
    <transition name="__poveste-fade">
      <div
        v-if="progress.total > 0"
        class="ptw-grid ptw-gap-2"
        :style="{
          gridTemplateColumns: `repeat(${Math.min(Math.ceil(Math.sqrt(progress.total)), maxCols)}, minmax(0, 1fr))`,
        }"
      >
        <div
          v-for="n in progress.total"
          :key="n"
          class="ptw-bg-primary-500/10 ptw-rounded-full"
        >
          <div
            class="ptw-w-3 ptw-h-3 ptw-bg-primary-500 ptw-rounded-full ptw-duration-150 ptw-ease-out"
            :class="{
              'ptw-transition-transform ptw-scale-0': n >= progress.loaded,
            }"
          />
        </div>
      </div>
    </transition>
  </div>
</template>
