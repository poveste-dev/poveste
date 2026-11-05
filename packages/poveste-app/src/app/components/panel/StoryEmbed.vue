<script lang="ts" setup>
import { useIntersectionObserver } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'
import { useStoryStore } from '../../stores/story'
import StoryVariantSinglePreviewRemote from '../story/StoryVariantSinglePreviewRemote.vue'

const props = defineProps<{
  storyId: string
  variantId?: string | undefined
}>()

const storyStore = useStoryStore()
const story = computed(() => storyStore.getStoryById(props.storyId))
// A copy, because the preview marks its variant not ready as it mounts. On the variant
// the book has open, that took the docs pane away, and this embed with it.
const variant = computed(() => {
  const found = props.variantId
    ? story.value?.variants.find(v => v.id === props.variantId)
    : story.value?.variants[0]
  return found && reactive({ ...found, state: {}, previewReady: false })
})

// Each embed boots a sandbox, and a docs page has none otherwise.
const el = ref<HTMLElement>()
const seen = ref(false)
const { stop } = useIntersectionObserver(el, ([entry]) => {
  if (entry?.isIntersecting) {
    seen.value = true
    stop()
  }
}, {
  rootMargin: '200px',
})
</script>

<template>
  <div
    ref="el"
    class="relative my-4 min-h-10 rounded border border-solid border-gray-100 dark:border-gray-800 overflow-hidden"
    data-testid="story-embed"
  >
    <template v-if="variant">
      <div class="absolute inset-0 bind-preview-bg" />
      <StoryVariantSinglePreviewRemote
        v-if="seen"
        class="relative"
        :story="story!"
        :variant="variant"
        auto-height
        :responsive="false"
      />
    </template>
    <p
      v-else
      class="p-2 text-sm opacity-70"
    >
      There's no story "{{ storyId }}"{{ variantId ? ` with a variant "${variantId}"` : '' }} to show here.
    </p>
  </div>
</template>
