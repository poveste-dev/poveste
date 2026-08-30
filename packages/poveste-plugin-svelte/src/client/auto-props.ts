import type { AutoPropComponentDefinition } from '@poveste/shared'
import { applyState } from '@poveste/shared'
import { watch as _watch } from '@poveste/vendors/vue'
import { getContext } from 'svelte'
import { readable } from 'svelte/store'

type Values = Record<string, any>[][]

const EMPTY: Record<string, any> = Object.freeze({})

/**
 * Publishes what the panel renders (`_hPropDefs`) and returns a store of what
 * the reader has set, which the rewritten markup spreads onto each component.
 */
export function autoProps(defs: AutoPropComponentDefinition[][]) {
  const story = getContext<any>('__pvtStory')
  const variant = getContext<any>('__pvtVariant')

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
    // returns a reactive proxy that cannot equal what was written.
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
    // Narrow sources, not one deep watch over the whole state: `initState`
    // replaces the object, controls write `_hPropState`, and the state sync can
    // drop the published table.
    const stops = [
      _watch(() => variant.state, run),
      _watch(() => variant.state?._hPropState, run, { deep: true }),
      _watch(() => variant.state?._hPropDefs?.length, run),
    ]
    return () => stops.forEach(stop => stop())
  })
}

// State survives a reload, so turning auto-props off has to take the controls.
function retract(variant: any): void {
  if (variant?.state?._hPropDefs?.length) {
    applyState(variant.state, { _hPropDefs: [] })
  }
}

// The component's position in its variant, which is how `_hPropState` is keyed.
function slots(perVariant: AutoPropComponentDefinition[]): number {
  return perVariant.reduce((max, def) => Math.max(max, def.index + 1), 0)
}

/**
 * Which variant's controls this realm answers to, or -1 for none. The story's
 * own `autoPropsDisabled` is read directly, because story props reach only an
 * implicit variant (#466).
 */
export function variantToDrive(story: any, variant: any): number {
  if (!story || !variant || story.autoPropsDisabled || variant.autoPropsDisabled) {
    return -1
  }
  return story.variants?.findIndex((candidate: any) => candidate.id === variant.id) ?? -1
}
