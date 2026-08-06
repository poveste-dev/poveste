<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { computed } from 'vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { povesteConfig } from '../../util/config'
import { isDark } from '../../util/dark'
import { getContrastColor } from '../../util/preview-settings'
import GenericRenderStory from './GenericRenderStory.vue'
import StoryResponsivePreview from './StoryResponsivePreview.vue'

const props = defineProps<{
  story: Story
  variant: Variant
}>()

Object.assign(props.variant, {
  previewReady: false,
})

function onReady() {
  Object.assign(props.variant, {
    previewReady: true,
  })
}

const settings = usePreviewSettingsStore().currentSettings

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
      class="ptw-relative"
      data-test-id="sandbox-render"
    >
      <GenericRenderStory
        :key="`${story.id}-${variant.id}`"
        :variant="variant"
        :story="story"
        class="ptw-h-full"
        :class="{
          [povesteConfig.sandboxDarkClass]: isDark, // @TODO remove
          [povesteConfig.theme.darkClass]: isDark,
        }"
        :dir="settings.textDirection"
        @ready="onReady"
      />
    </div>
  </StoryResponsivePreview>
</template>
