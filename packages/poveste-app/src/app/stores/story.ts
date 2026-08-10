import type { Story, Variant } from '../types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { router } from '../router'

export const useStoryStore = defineStore('story', () => {
  const stories = ref<Story[]>([])
  function setStories(value: Story[]) {
    stories.value = value
  }

  const currentStory = computed(() => stories.value.find(s => s.id === router.currentRoute.value.params.storyId))

  const currentVariant = computed(() => currentStory.value?.variants.find(v => v.id === router.currentRoute.value.query.variantId))

  const maps = computed(() => {
    const storyMap = new Map<string, Story>()
    const variantMap = new Map<string, Variant>()
    for (const story of stories.value) {
      storyMap.set(story.id, story)
      for (const variant of story.variants) {
        variantMap.set(`${story.id}:${variant.id}`, variant)
      }
    }
    return {
      stories: storyMap,
      variants: variantMap,
    }
  })

  function getStoryById(id: string) {
    return maps.value.stories.get(id)
  }

  function getVariantById(idWithStoryId: string) {
    return maps.value.variants.get(idWithStoryId)
  }

  /**
   * Whether a variant's preview has finished mounting. The preview components
   * report it and `StorySidePanel` waits on it, so it has to be reachable from
   * both — and it stays a field on the variant rather than a map in here
   * because it pairs with `configReady`, which the framework plugins write from
   * inside the sandbox. The side panel reads the two together; splitting them
   * across two owners would make that condition harder to follow, not easier.
   *
   * What does belong here is the write. This store owns the variant objects,
   * so a component reaching into one of its own props to flip the flag was the
   * part that needed to go.
   */
  function setPreviewReady(variant: Variant, value: boolean) {
    variant.previewReady = value
  }

  return {
    stories,
    setStories,
    currentStory,
    currentVariant,
    getStoryById,
    getVariantById,
    setPreviewReady,
  }
})
