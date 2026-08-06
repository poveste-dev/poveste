<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { isMobile } from '../../util/responsive'
import DevOnlyToolbarOpenInEditor from '../toolbar/DevOnlyToolbarOpenInEditor.vue'
import ToolbarBackground from '../toolbar/ToolbarBackground.vue'
import ToolbarNewTab from '../toolbar/ToolbarNewTab.vue'
import ToolbarResponsiveSize from '../toolbar/ToolbarResponsiveSize.vue'
import ToolbarTextDirection from '../toolbar/ToolbarTextDirection.vue'
import ToolbarTitle from '../toolbar/ToolbarTitle.vue'
import StoryVariantSinglePreviewNative from './StoryVariantSinglePreviewNative.vue'
import StoryVariantSinglePreviewRemote from './StoryVariantSinglePreviewRemote.vue'

defineProps<{
  variant: Variant
  story: Story
}>()
</script>

<template>
  <div
    class="poveste-story-variant-single-view ptw-h-full ptw-flex ptw-flex-col"
    data-test-id="story-variant-single-view"
  >
    <!-- Toolbar -->
    <div
      v-if="!isMobile"
      class="ptw-flex-none ptw-flex ptw-items-center ptw-h-8 -ptw-mt-1"
    >
      <ToolbarTitle
        :variant="variant"
      />
      <ToolbarResponsiveSize
        v-if="!variant.responsiveDisabled"
      />
      <ToolbarBackground />
      <ToolbarTextDirection />
      <ToolbarNewTab
        :variant="variant"
        :story="story"
      />

      <DevOnlyToolbarOpenInEditor
        v-if="__POVESTE_DEV__"
        :file="story.file?.filePath"
        tooltip="Edit story in editor"
      />
    </div>

    <!-- Preview -->
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
