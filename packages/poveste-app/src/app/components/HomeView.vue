<script lang="ts" setup>
import { computed } from 'vue'
import PovesteLogo from '../assets/poveste.svg'
import { useStoryStore } from '../stores/story'
import { customLogos, povesteConfig } from '../util/config'
import HomeCounter from './app/HomeCounter.vue'

const logoUrl = computed(() => povesteConfig.theme?.logo?.square ? customLogos.square : PovesteLogo)
const storyStore = useStoryStore()

const stats = computed(() => {
  let storyCount = 0
  let variantCount = 0
  let docsCount = 0;

  (storyStore.stories || []).forEach((story) => {
    if (story.docsOnly) {
      docsCount++
    }
    else {
      storyCount++
      if (story.variants) {
        variantCount += story.variants.length
      }
    }
  })

  return {
    storyCount,
    variantCount,
    docsCount,
  }
})
</script>

<template>
  <div class="poveste-home-view ptw-flex md:ptw-flex-col ptw-gap-12 ptw-items-center ptw-justify-center ptw-h-full">
    <img
      :src="logoUrl"
      alt="Logo"
      class="ptw-w-64 ptw-h-64 ptw-opacity-25 ptw-mb-8 ptw-hidden md:ptw-block"
    >
    <div class="ptw-flex !md:ptw-flex-col ptw-flex-wrap ptw-justify-evenly ptw-gap-2 ptw-px-4 ptw-py-2 ptw-bg-gray-100 dark:ptw-bg-gray-750 ptw-rounded ptw-border ptw-border-gray-500/30">
      <HomeCounter
        title="Stories"
        icon="carbon:cube"
        :count="stats.storyCount"
      />
      <HomeCounter
        title="Variants"
        icon="carbon:cube-view"
        :count="stats.variantCount"
      />
      <HomeCounter
        title="Documents"
        icon="carbon:document-blank"
        :count="stats.docsCount"
      />
    </div>
  </div>
</template>
