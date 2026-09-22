import type { Story, Variant } from '@poveste/shared'
import { toRaw } from '@poveste/vendors/vue'
import { variantIndexContext } from '../contexts.js'
import RenderStorySvelte from './RenderStory.svelte'
import RenderVariantSvelte from './RenderVariant.svelte'

type SvelteComponentFunction = (anchor: any, props: any) => any

/**
 * `Hst.Story` and `Hst.Variant` for a render of `story` that shows `variant`.
 *
 * The story's `{#each}` calls `Hst.Variant` once per variant, and a sandbox mounts
 * the story again on every retarget. A `RenderVariant` for another variant renders
 * nothing and changes nothing, yet creating them was most of a retarget: 3ms of 7ms
 * at 1000 variants (#888). So only the shown one is created, and the rest are
 * counted, which is all they did.
 */
export function renderStoryComponents(story: Story, variant: Variant) {
  const shownIndex = toRaw(story).variants.findIndex(({ id }) => id === variant.id)
  let seen = 0

  const Story: SvelteComponentFunction = (anchor, props) => {
    // Counted per `Hst.Story` instance, as `RenderStory`'s own index is: a hot
    // update runs the story again with these same components.
    seen = 0
    return (RenderStorySvelte as unknown as SvelteComponentFunction)(anchor, props)
  }

  const Variant: SvelteComponentFunction = (anchor, props) => {
    if (seen++ !== shownIndex) {
      return
    }
    // `RenderVariant` finds its variant at the position `RenderStory` counts.
    variantIndexContext.get('<Story>').value = shownIndex
    return (RenderVariantSvelte as unknown as SvelteComponentFunction)(anchor, props)
  }

  return { Story, Variant }
}
