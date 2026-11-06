<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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
// `scrollMargin` reaches into the docs pane, which scrolls on its own and clips the
// embed before the viewport does. vueuse doesn't pass it on. A browser without it
// boots the embed once it's visible.
let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      seen.value = true
      observer?.disconnect()
    }
  }, { rootMargin: '200px', scrollMargin: '200px' })
  observer.observe(el.value!)
})
onBeforeUnmount(() => observer?.disconnect())
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
