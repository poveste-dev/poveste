import { nextTick as bundledNextTick, reactive as bundledReactive } from '@poveste/vendors/vue'
import { describe, expect, it } from 'vitest'
import { nextTick, reactive } from 'vue'
import { syncStateBundledAndExternal } from '../util.js'

// These run against both Vue copies for real: `@poveste/vendors/vue` is the one
// poveste bundles, `vue` is the one a user's story would run on. That is the
// whole point — the sync exists because the two have separate reactivity graphs
// and separate schedulers, and nothing about it can be tested with one of them.

// Each side flushes on its own scheduler and a write can bounce between them a
// few times before settling, so drain both alternately rather than once.
async function settle() {
  for (let i = 0; i < 6; i++) {
    await nextTick()
    await bundledNextTick()
  }
}

function setup(initial: Record<string, any>) {
  const bundled = bundledReactive(structuredClone(initial))
  const external = reactive(structuredClone(initial))
  const sync = syncStateBundledAndExternal(bundled, external)
  return { bundled, external, sync }
}

describe('syncStateBundledAndExternal', () => {
  it('mirrors an edit in each direction', async () => {
    const { bundled, external, sync } = setup({ count: 0 })
    await settle()

    external.count = 1
    await settle()
    expect(bundled.count).toBe(1)

    bundled.count = 2
    await settle()
    expect(external.count).toBe(2)

    sync.stop()
  })

  it('stops mirroring once stopped', async () => {
    const { bundled, external, sync } = setup({ count: 0 })
    await settle()
    sync.stop()

    external.count = 1
    await settle()
    expect(bundled.count).toBe(0)
  })

  // The #95 regression. `applyState` iterates the incoming keys, so it has no
  // way to express "this key is gone" — the write it performs for a removal
  // changes nothing on the far side, and the far side's watcher never fires.
  //
  // That matters because the two watchers coordinate through a `syncing` boolean
  // meaning "ignore the next firing, it is my own echo", and the counterpart
  // firing is what clears it. No counterpart, no clear: the flag stayed set, and
  // the next edit was mistaken for an echo and dropped on the floor.
  //
  // Worth being exact about how bad this was in the shipped app, because it is
  // the reason the issue had no repro: it never bit here. Vue stories always
  // carry `_hPropState` and `_hPropDefs`, and `applyState` sent every
  // `_h`-prefixed key down the plain-assignment branch, so those two were
  // re-identified on every apply and a counterpart firing was guaranteed. The
  // invariant held by luck. These tests use a state without that bookkeeping,
  // which is what the function actually promises to handle — and which is the
  // shape the sandbox bridge and `plugin-svelte` were relying on luck for too.
  it('does not drop the edit after a removal it cannot mirror', async () => {
    const { bundled, external, sync } = setup({ count: 0, gone: 1 })
    await settle()

    delete external.gone
    await settle()

    external.count = 1
    await settle()
    expect(bundled.count).toBe(1)

    sync.stop()
  })

  it('does not drop the edit after a nested removal it cannot mirror', async () => {
    // The same shape one level down, and the more plausible one: a story that
    // drops an entry out of a map in state, then touches a control.
    const { bundled, external, sync } = setup({ count: 0, items: { a: 1, b: 2 } })
    await settle()

    delete external.items.b
    await settle()

    external.count = 1
    await settle()
    expect(bundled.count).toBe(1)

    sync.stop()
  })

  it('does not drop the edit after a change that nets out to nothing', async () => {
    const { bundled, external, sync } = setup({ count: 0, list: [1, 2] })
    await settle()

    external.list.push(9)
    external.list.pop()
    await settle()

    external.count = 1
    await settle()
    expect(bundled.count).toBe(1)

    sync.stop()
  })

  it('leaves object identity alone on both sides when a sync changes nothing', async () => {
    // The other half of the fix, and the reason the flag can now be trusted.
    // `toRawDeep` rebuilds every object it passes, so mirroring `count` used to
    // drop a fresh `nested` and `list` onto the receiving side as well, and each
    // of those re-triggered its watchers. Every sync was a burst of firings that
    // happened to keep the count even; none of them meant anything.
    const { bundled, external, sync } = setup({ count: 0, nested: { a: 1 }, list: [1, 2] })
    await settle()

    const externalNested = external.nested
    const externalList = external.list
    const bundledNested = bundled.nested
    const bundledList = bundled.list

    external.count = 1
    await settle()

    expect(bundled.count).toBe(1)
    expect(external.nested).toBe(externalNested)
    expect(external.list).toBe(externalList)
    // The receiving side is the one that used to get churned.
    expect(bundled.nested).toBe(bundledNested)
    expect(bundled.list).toBe(bundledList)

    sync.stop()
  })

  it('mirrors many edits in a row without falling behind', async () => {
    const { bundled, external, sync } = setup({ count: 0 })
    await settle()

    for (let i = 1; i <= 10; i++) {
      external.count = i
      await settle()
      expect(bundled.count).toBe(i)
    }

    sync.stop()
  })
})
