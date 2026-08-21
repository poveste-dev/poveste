import { nextTick as bundledNextTick, reactive as bundledReactive } from '@poveste/vendors/vue'
import { describe, expect, it } from 'vitest'
import { nextTick, reactive, watch } from 'vue'
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

  // The #96 regression, and the reason the `syncing` flag is gone rather than
  // repaired. Both watchers mirrored the whole of their side, so the second one
  // to fire carried its own edit *and* its copy of the key the first side had
  // just changed — one edit stale, because the mirror had not reached it yet.
  // Last writer won, and it won across every key rather than just its own.
  it('keeps both edits when the two sides change in the same tick', async () => {
    const { bundled, external, sync } = setup({ a: 0, b: 0 })
    await settle()

    external.a = 1
    bundled.b = 1
    await settle()

    expect({ a: external.a, b: external.b }).toEqual({ a: 1, b: 1 })
    expect({ a: bundled.a, b: bundled.b }).toEqual({ a: 1, b: 1 })

    sync.stop()
  })

  it('keeps both edits when the two sides change in the same tick, bundled first', async () => {
    // Which watcher happens to flush first decided who lost, so pin both orders.
    const { bundled, external, sync } = setup({ a: 0, b: 0 })
    await settle()

    bundled.b = 1
    external.a = 1
    await settle()

    expect({ a: external.a, b: external.b }).toEqual({ a: 1, b: 1 })
    expect({ a: bundled.a, b: bundled.b }).toEqual({ a: 1, b: 1 })

    sync.stop()
  })

  it('keeps both edits when they land in different keys of the same object', async () => {
    // The nested form: two entries of one map, which whole-object mirroring
    // could not separate even in principle.
    const { bundled, external, sync } = setup({ items: { a: 0, b: 0 } })
    await settle()

    external.items.a = 1
    bundled.items.b = 1
    await settle()

    expect(external.items).toEqual({ a: 1, b: 1 })
    expect(bundled.items).toEqual({ a: 1, b: 1 })

    sync.stop()
  })

  it('keeps a concurrent edit made while the other side is mid-flight', async () => {
    // Not the same tick, and it passed before the fix too — kept because it
    // pins the interleaving the flag was most delicate about: the far side edits
    // after a mirror has landed but before its echo has been observed.
    const { bundled, external, sync } = setup({ a: 0, b: 0 })
    await settle()

    external.a = 1
    await nextTick()
    bundled.b = 1
    await settle()

    expect({ a: external.a, b: external.b }).toEqual({ a: 1, b: 1 })
    expect({ a: bundled.a, b: bundled.b }).toEqual({ a: 1, b: 1 })

    sync.stop()
  })

  it('mirrors an edit made to a key the other side removed', async () => {
    // A removal cannot cross, so the two sides disagree about that key from then
    // on. The baseline must not mistake that standing disagreement for a change
    // and start replaying it — nor let it mask the next real edit.
    const { bundled, external, sync } = setup({ count: 0, gone: 1 })
    await settle()

    delete external.gone
    await settle()

    bundled.count = 5
    await settle()
    expect(external.count).toBe(5)

    external.count = 6
    await settle()
    expect(bundled.count).toBe(6)

    sync.stop()
  })

  it('does not let a mirrored array alias the baseline', async () => {
    // An array always crosses whole — `applyState` assigns it rather than
    // merging — so the receiving side ends up holding the very object the
    // baseline recorded. Reactive writes go through to the raw target, so
    // without a copy the next `push` lands in the baseline as well, and the sync
    // reads the edit back as already agreed and drops it.
    const { bundled, external, sync } = setup({ list: [1, 2] })
    await settle()

    external.list = [1, 2, 3]
    await settle()
    expect(bundled.list).toEqual([1, 2, 3])

    bundled.list.push(4)
    await settle()
    expect(external.list).toEqual([1, 2, 3, 4])

    sync.stop()
  })

  it('does not let a mirrored object alias the baseline', async () => {
    // Same hazard by the other route into the wholesale branch: a key the far
    // side does not have yet is assigned rather than merged.
    const { bundled, external, sync } = setup({ count: 0 })
    await settle()

    external.added = { a: 1 }
    await settle()
    expect(bundled.added).toEqual({ a: 1 })

    bundled.added.a = 2
    await settle()
    expect(external.added.a).toBe(2)

    sync.stop()
  })

  it('mirrors a write the story makes in reaction to a control edit', async () => {
    // The realistic form of #96, and the one a book actually hits: a story that
    // derives one state key from another. Editing `a` in the controls panel is
    // one edit, but the story answering it with `b` is a second, and it lands
    // while the first is still in flight — so the two sides are changing at the
    // same time without anyone having to do anything unusual.
    //
    // The story's watcher is installed before the sync here, and that ordering
    // is the whole of it: Vue flushes by creation order, so the story's write
    // lands before the sync watcher runs and rides in on the very firing the
    // flag was waiting to discard. Install the sync first and the same code
    // survived, which is why this never showed up as a reliable bug.
    //
    // Both orders occur. `Variant` attaches its sync in `setup()`, before the
    // story mounts; `RenderStory` tears the sync down and re-attaches it when
    // the variant changes, by which time the story's watchers are long since
    // registered. A flag whose correctness turns on which of those you got is
    // not correct, it is lucky.
    const bundled = bundledReactive({ a: 0, b: 0 })
    const external = reactive({ a: 0, b: 0 })

    const stop = watch(() => external.a, (value) => {
      external.b = value * 2
    })
    const sync = syncStateBundledAndExternal(bundled, external)
    await settle()

    bundled.a = 1
    await settle()

    expect(external.b).toBe(2)
    expect(bundled.b).toBe(2)

    stop()
    sync.stop()
  })

  it('mirrors only what moved without taking the neighbouring keys with it', async () => {
    // Sending less than the whole object is what stops the two sides clobbering
    // each other, and it is only safe as far as `applyState` merges — one level,
    // and never for an `_h` key, which it replaces outright for the sandbox's
    // sake. Narrow past either and the subset lands *as* the object.
    //
    // Every Vue story carries `_hPropState`, so getting that wrong empties the
    // auto-props of every story in the book rather than failing somewhere quiet.
    const initial = { _hPropState: { a: 1, b: 2 }, deep: { inner: { x: 1, y: 2 } } }
    const bundled = bundledReactive(structuredClone(initial))
    const external = reactive(structuredClone(initial))
    const sync = syncStateBundledAndExternal(bundled, external)
    await settle()

    external._hPropState.a = 9
    external.deep.inner.x = 9
    await settle()

    expect(bundled._hPropState).toEqual({ a: 9, b: 2 })
    expect(bundled.deep.inner).toEqual({ x: 9, y: 2 })

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
