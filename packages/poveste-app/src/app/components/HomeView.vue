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
  <div class="poveste-home-view flex md:flex-col gap-12 items-center justify-center h-full">
    <img
      :src="logoUrl"
      alt="Logo"
      class="w-64 h-64 opacity-25 mb-8 hidden md:block"
    >
    <div class="flex !md:flex-col flex-wrap justify-evenly gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-750 rounded border border-gray-500/30">
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
