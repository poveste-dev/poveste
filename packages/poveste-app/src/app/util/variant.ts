import type { Ref } from 'vue'
import type { Story, Variant } from '../types'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * Whether opening this story will put a variant in the route by itself.
 *
 * `StoryView` resolves the variant one tick after the story, so anything that
 * has to tell "a variant is on its way" from "this story is waiting for the
 * reader to pick one" needs the same answer it will give — hence one predicate
 * rather than two copies of the condition (#328).
 */
export function autoSelectsVariant(story: Story | null | undefined): boolean {
  return !!story && (!!story.lastSelectedVariant || story.variants.length === 1)
}

export function useCurrentVariantRoute(variant: Ref<Variant>) {
  const route = useRoute()
  const isActive = computed(() => route.query.variantId === variant.value.id)
  const targetRoute = computed(() => ({
    ...route,
    query: {
      ...route.query,
      variantId: variant.value.id,
    },
  }))

  return {
    isActive,
    targetRoute,
  }
}
