<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import StoryVariantSinglePreviewNative from './StoryVariantSinglePreviewNative.vue'
import StoryVariantSinglePreviewRemote from './StoryVariantSinglePreviewRemote.vue'

defineProps<{
  variant: Variant
  story: Story
}>()
</script>

<template>
  <div
    class="poveste-story-variant-single-view h-full flex flex-col"
    data-test-id="story-variant-single-view"
  >
    <StoryVariantSinglePreviewNative
      v-if="story.layout?.iframe === false"
      :story="story"
      :variant="variant"
    />
    <StoryVariantSinglePreviewRemote
      v-else
      :story="story"
      :variant="variant"
    />
  </div>
</template>
