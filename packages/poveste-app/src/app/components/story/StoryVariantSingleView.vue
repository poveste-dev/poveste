<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { shallowRef, watchEffect } from 'vue'
import { autoSelectsVariant } from '../../util/variant'
import StoryVariantSinglePreviewNative from './StoryVariantSinglePreviewNative.vue'
import StoryVariantSinglePreviewRemote from './StoryVariantSinglePreviewRemote.vue'

const props = defineProps<{
  story: Story | undefined
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
 *
 * The hold is released when the new story is not going to select a variant at
 * all, because then there is no gap to bridge — only a reader looking at a
 * variant list. Holding there would leave the story they left running behind a
 * hidden iframe for as long as they stay, timers and all.
 */
const shown = shallowRef<{ story: Story, variant: Variant } | null>(null)

watchEffect(() => {
  // Read outside the branch: while `variant` is null this effect would
  // otherwise not depend on `story`, and an HMR update that replaces the story
  // object would leave the pair below pointing at the discarded one.
  const story = props.story

  if (story && props.variant) {
    shown.value = { story, variant: props.variant }
  }
  else if (shown.value && shown.value.story !== story && !autoSelectsVariant(story)) {
    shown.value = null
  }
})
</script>

<template>
  <div
    class="poveste-story-variant-single-view h-full flex flex-col"
    :class="{ invisible: !variant }"
    data-testid="story-variant-single-view"
  >
    <!--
      Hidden rather than unmounted across the gap. What it holds then is the
      story the reader has just left, and showing that is the trap the block
      above is about: the preview is only correct once the route names a
      variant again.
    -->
    <template v-if="shown">
      <StoryVariantSinglePreviewNative
        v-if="shown.story.layout?.iframe === false"
        :story="shown.story"
        :variant="shown.variant"
      />
      <StoryVariantSinglePreviewRemote
        v-else
        :story="shown.story"
        :variant="shown.variant"
      />
    </template>
  </div>
</template>
