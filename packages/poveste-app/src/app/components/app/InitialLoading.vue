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
  <div class="poveste-initial-loading fixed inset-0 bg-white dark:bg-gray-700 flex flex-col gap-6 items-center justify-center">
    <transition name="__poveste-fade">
      <div
        v-if="progress.total > 0"
        class="grid gap-2"
        :style="{
          gridTemplateColumns: `repeat(${Math.min(Math.ceil(Math.sqrt(progress.total)), maxCols)}, minmax(0, 1fr))`,
        }"
      >
        <div
          v-for="n in progress.total"
          :key="n"
          class="bg-primary-500/10 rounded-full"
        >
          <div
            class="w-3 h-3 bg-primary-500 rounded-full duration-150 ease-out"
            :class="{
              'transition-transform scale-0': n >= progress.loaded,
            }"
          />
        </div>
      </div>
    </transition>
  </div>
</template>
