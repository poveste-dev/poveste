import type { AutoPropComponentDefinition } from '@poveste/shared'
import { applyState } from '@poveste/shared'
import { watch as _watch } from '@poveste/vendors/vue'
import { getContext } from 'svelte'
import { readable } from 'svelte/store'

type Values = Record<string, any>[][]

/**
 * The runtime half of auto-props, called once from the top of a story file that
 * `transformStoryAutoProps` has rewritten.
 *
 * It publishes what the controls panel renders (`_hPropDefs`) and returns a
 * store of what the reader has set (`_hPropState`), which the rewritten markup
 * spreads onto each component. A store rather than a rune so the same injection
 * works in a legacy story and a runes one.
 */
export function autoProps(defs: AutoPropComponentDefinition[][]) {
  const story = getContext<any>('__pvtStory')
  const variant = getContext<any>('__pvtVariant')

  const index = variantToDrive(story, variant)
  if (index < 0) {
    return readable(blank(defs))
  }

  const mine = defs[index] ?? []

  return readable(shape(defs, index, variant), (set) => {
    // Watches the state object itself, not only its contents: `initState` runs
    // after this and replaces `variant.state` wholesale, which dropped the
    // definitions written into the object it replaced. Re-publishing on every
    // run is what makes the order between them stop mattering.
    return _watch(
      () => [variant.state, variant.state?._hPropState],
      () => {
        publish(variant, mine)
        set(shape(defs, index, variant))
      },
      { deep: true, immediate: true },
    )
  })
}

function publish(variant: any, mine: AutoPropComponentDefinition[]): void {
  if (!mine.length || !variant.state || variant.state._hPropDefs === mine) {
    return
  }
  applyState(variant.state, { _hPropDefs: mine })
  if (!variant.state._hPropState) {
    applyState(variant.state, { _hPropState: {} })
  }
}

function blank(defs: AutoPropComponentDefinition[][]): Values {
  return defs.map(perVariant => slots(perVariant).map(() => ({})))
}

function shape(defs: AutoPropComponentDefinition[][], index: number, variant: any): Values {
  return defs.map((perVariant, position) => slots(perVariant).map(component =>
    position === index ? variant.state?._hPropState?.[component] ?? {} : {},
  ))
}

// Indexed by the component's position in its variant, which is what the markup
// spreads and what the panel keys `_hPropState` by — so a component with no
// props still occupies its slot.
function slots(perVariant: AutoPropComponentDefinition[]): number[] {
  const size = perVariant.reduce((max, def) => Math.max(max, def.index + 1), 0)
  return Array.from({ length: size }, (_, component) => component)
}

/**
 * Which variant's controls this realm answers to, or -1 for none.
 *
 * Only the realm rendering a variant has one: the mount realm registers
 * configuration for every variant and renders none of them, and collection runs
 * `autoPropsDisabled` is read off both: a variant carries its own, and the story
 * carries the story-level one directly, because story props reach only an
 * implicit variant (#466) and the option has to work either way.
 */
export function variantToDrive(story: any, variant: any): number {
  if (!story || !variant || story.autoPropsDisabled || variant.autoPropsDisabled) {
    return -1
  }
  return story.variants?.findIndex((candidate: any) => candidate.id === variant.id) ?? -1
}
