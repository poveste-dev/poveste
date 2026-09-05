<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { shallowRef, watchEffect } from 'vue'
import StoryVariantSinglePreviewNative from './StoryVariantSinglePreviewNative.vue'
import StoryVariantSinglePreviewRemote from './StoryVariantSinglePreviewRemote.vue'

const props = defineProps<{
  story: Story
  variant: Variant | null
}>()

/*
 * The pair the preview renders, which is not always the pair the route names.
 *
 * Opening a story is two route changes — the story, then the variant
 * `StoryView` picks for it — and `currentVariant` is null in between. The
 * preview used to be mounted under a `v-if` on that variant, so every sidebar
 * click destroyed it and rebuilt it, and the realm reuse in the preview
 * components below was never reached: the component was gone before its
 * `watch(sandboxUrl)` could run (#328).
 *
 * Holding the last pair keeps one instance across the gap. The pair rather than
 * the variant alone because the story changes first, and a new story with the
 * previous story's variant resolves to a sandbox URL that names neither.
 */
const shown = shallowRef<{ story: Story, variant: Variant } | null>(null)

watchEffect(() => {
  if (props.variant) {
    shown.value = { story: props.story, variant: props.variant }
  }
})
</script>

<template>
  <div
    class="poveste-story-variant-single-view h-full flex flex-col"
    data-testid="story-variant-single-view"
  >
    <!--
      Hidden rather than unmounted while no variant is selected. What it holds
      then is the story the reader has just left, and showing that is the trap
      the paragraph above is about: the preview is only correct once the route
      names a variant again.
    -->
    <template v-if="shown">
      <StoryVariantSinglePreviewNative
        v-if="shown.story.layout?.iframe === false"
        :story="shown.story"
        :variant="shown.variant"
        :class="{ invisible: !variant }"
      />
      <StoryVariantSinglePreviewRemote
        v-else
        :story="shown.story"
        :variant="shown.variant"
        :class="{ invisible: !variant }"
      />
    </template>
  </div>
</template>
