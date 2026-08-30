import type { AutoPropComponentDefinition } from '@poveste/shared'
import { applyState } from '@poveste/shared'
import { watch as _watch } from '@poveste/vendors/vue'
import { getContext } from 'svelte'
import { readable } from 'svelte/store'

type Values = Record<string, any>[][]

const EMPTY: Record<string, any> = Object.freeze({})

/**
 * The runtime half of auto-props, called once from the top of a story file the
 * transform has rewritten. It publishes what the panel renders (`_hPropDefs`)
 * and returns a store of what the reader has set (`_hPropState`), which the
 * rewritten markup spreads onto each component.
 */
export function autoProps(defs: AutoPropComponentDefinition[][]) {
  const story = getContext<any>('__pvtStory')
  const variant = getContext<any>('__pvtVariant')

  // Only the realm rendering a variant has one to drive: the mount realm
  // registers configuration for every variant and renders none of them, and
  // collection runs without a DOM.
  const index = variantToDrive(story, variant)
  const inert: Values = defs.map(perVariant => Array.from({ length: slots(perVariant) }).fill(EMPTY) as Record<string, any>[])

  if (index < 0) {
    retract(variant)
    return readable(inert)
  }

  const mine = defs[index] ?? []
  const shape = (): Values => {
    const rows = inert.slice()
    rows[index] = Array.from({ length: slots(mine) }, (_, component) =>
      variant.state?._hPropState?.[component] ?? EMPTY)
    return rows
  }

  let publishedInto: any = null
  function publish() {
    // Identity of the state object, never of the definitions: reading those back
    // returns a reactive proxy that cannot equal what was written. `initState`
    // replaces the object wholesale after this runs, and the state bridge can
    // drop the key from the object it keeps, so a missing table republishes too.
    if (!variant.state || (publishedInto === variant.state && variant.state._hPropDefs?.length)) {
      return
    }
    publishedInto = variant.state
    applyState(variant.state, { _hPropDefs: mine })
    if (!variant.state._hPropState) {
      applyState(variant.state, { _hPropState: {} })
    }
  }

  return readable(shape(), (set) => {
    const run = () => {
      publish()
      set(shape())
    }
    run()
    // Three narrow sources rather than one deep watch over the whole state,
    // which charged every unrelated keystroke a full traversal of the story's
    // own data: the object itself, because `initState` replaces it after this
    // runs; the values a control can write; and the published table, because the
    // state sync can drop it and it has to be put back.
    const stops = [
      _watch(() => variant.state, run),
      _watch(() => variant.state?._hPropState, run, { deep: true }),
      _watch(() => variant.state?._hPropDefs?.length, run),
    ]
    return () => stops.forEach(stop => stop())
  })
}

// A variant that stops producing definitions keeps whatever it published, and
// `mapVariant` carries state across a reload — so turning auto-props off has to
// take the controls with it.
function retract(variant: any): void {
  if (variant?.state?._hPropDefs?.length) {
    applyState(variant.state, { _hPropDefs: [] })
  }
}

// Indexed by the component's position in its variant, which is what the markup
// spreads and what the panel keys `_hPropState` by.
function slots(perVariant: AutoPropComponentDefinition[]): number {
  return perVariant.reduce((max, def) => Math.max(max, def.index + 1), 0)
}

/**
 * Which variant's controls this realm answers to, or -1 for none.
 *
 * `autoPropsDisabled` is read off both: a variant carries its own, and the story
 * carries the story-level one directly, because story props reach only an
 * implicit variant (#466).
 */
export function variantToDrive(story: any, variant: any): number {
  if (!story || !variant || story.autoPropsDisabled || variant.autoPropsDisabled) {
    return -1
  }
  return story.variants?.findIndex((candidate: any) => candidate.id === variant.id) ?? -1
}
