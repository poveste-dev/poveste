import type { StoryError } from '@poveste/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Errors reported by a sandbox while rendering a variant (#323).
//
// This only knows about variants that have actually rendered. A variant is not
// mounted until it scrolls into the grid's window (#103), so the absence of a
// marker means "not seen to fail", never "fine" — telling a book it is healthy
// would need a rendering pass, which is the open half of #323.
export const useStoryErrorStore = defineStore('story-errors', () => {
  const errors = ref(new Map<string, StoryError>())

  const key = (storyId: string, variantId?: string | null) => `${storyId}::${variantId ?? ''}`

  function report(error: StoryError) {
    if (!error.storyId) {
      return
    }
    errors.value.set(key(error.storyId, error.variantId), error)
  }

  // A variant is re-rendered on every retarget, so last render wins: a story
  // that has been fixed must stop being marked without a reload.
  function clear(storyId: string, variantId?: string | null) {
    errors.value.delete(key(storyId, variantId))
  }

  const forVariant = computed(() => (storyId: string, variantId?: string | null) =>
    errors.value.get(key(storyId, variantId)))

  const storyHasError = computed(() => (storyId: string) => {
    for (const [entry] of errors.value) {
      if (entry.startsWith(`${storyId}::`)) {
        return true
      }
    }
    return false
  })

  return {
    errors,
    report,
    clear,
    forVariant,
    storyHasError,
  }
})
