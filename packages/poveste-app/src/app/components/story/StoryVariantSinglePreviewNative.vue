<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { computed, watch } from 'vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { useStoryStore } from '../../stores/story'
import { previewDarkClasses, usePreviewDark } from '../../util/color-scheme'
import { povesteConfig } from '../../util/config'
import { getContrastColor } from '../../util/preview-settings'
import GenericRenderStory from './GenericRenderStory.vue'
import StoryResponsivePreview from './StoryResponsivePreview.vue'

const props = defineProps<{
  story: Story
  variant: Variant
}>()

const storyStore = useStoryStore()

// This component now outlives a story change (#328), so the flag is cleared per
// variant rather than once at setup. Both ends, as `StoryVariantGridItem` does
// for the same reason: the one arriving has not rendered yet, and the one
// leaving is no longer rendered anywhere.
watch(() => props.variant, (variant, previous) => {
  if (previous) {
    storyStore.setPreviewReady(previous, false)
  }
  storyStore.setPreviewReady(variant, false)
}, {
  immediate: true,
})

function onReady() {
  storyStore.setPreviewReady(props.variant, true)
}

const settings = usePreviewSettingsStore().currentSettings

const previewDark = usePreviewDark(settings)

const contrastColor = computed(() => getContrastColor(settings))
const autoApplyContrastColor = computed(() => !!povesteConfig.autoApplyContrastColor)
</script>

<template>
  <StoryResponsivePreview
    v-slot="{ isResponsiveEnabled, finalWidth, finalHeight }"
    class="poveste-story-variant-single-preview-native"
    :variant="variant"
  >
    <div
      :style="[
        isResponsiveEnabled ? {
          width: finalWidth ? `${finalWidth}px` : '100%',
          height: finalHeight ? `${finalHeight}px` : '100%',
        } : { width: '100%', height: '100%' },
        {
          '--poveste-contrast-color': contrastColor,
          // Deprecated alias — keep so stories referencing `var(--histoire-contrast-color)` still work.
          '--histoire-contrast-color': contrastColor,
          'color': autoApplyContrastColor ? contrastColor : undefined,
        },
      ]"
      class="relative"
      data-testid="sandbox-render"
    >
      <GenericRenderStory
        :key="`${story.id}-${variant.id}`"
        :variant="variant"
        :story="story"
        class="h-full"
        :class="previewDark ? previewDarkClasses() : undefined"
        :dir="settings.textDirection"
        @ready="onReady"
      />
    </div>
  </StoryResponsivePreview>
</template>
