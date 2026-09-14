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
 *
 * Any story with variants, deliberately. It used to require a remembered choice
 * or exactly one variant, which made `StoryView`'s `variants[0]` fallback
 * unreachable: a story with several variants and no history satisfied neither
 * clause, so the first visit of a session showed an empty panel and every visit
 * after it worked, because the first one recorded the history (#724).
 *
 * No layout clause. Grid stories already auto-selected on revisit through the
 * remembered choice, so excluding them here would auto-open them on the second
 * visit and never the first — this defect, made permanent for one layout.
 */
// A type predicate rather than `boolean`: the body already establishes that the
// story is there, and returning `boolean` threw that away at every call site —
// `StoryView` reads the story twice immediately after this returns true.
export function autoSelectsVariant(story: Story | null | undefined): story is Story {
  return !!story && story.variants.length > 0
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
