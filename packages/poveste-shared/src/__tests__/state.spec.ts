import { describe, expect, it } from 'vitest'
import { applyState, createStateBaseline, diffState, isEquivalent } from '../state.js'

describe('isEquivalent', () => {
  it('compares primitives the way Vue decides whether to trigger', () => {
    expect(isEquivalent(1, 1)).toBe(true)
    expect(isEquivalent('a', 'a')).toBe(true)
    expect(isEquivalent(null, null)).toBe(true)
    expect(isEquivalent(undefined, undefined)).toBe(true)
    // `Object.is`, not `===`: matches Vue's `hasChanged` on both of its oddities.
    expect(isEquivalent(Number.NaN, Number.NaN)).toBe(true)
    expect(isEquivalent(0, -0)).toBe(false)
    expect(isEquivalent(1, '1')).toBe(false)
    expect(isEquivalent(0, false)).toBe(false)
  })

  it('recurses into plain objects and arrays', () => {
    expect(isEquivalent({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } })).toBe(true)
    expect(isEquivalent({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 3] } })).toBe(false)
    expect(isEquivalent([1, 2], [1, 2, 3])).toBe(false)
    expect(isEquivalent({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(isEquivalent({ a: 1, b: 2 }, { a: 1 })).toBe(false)
    // Same key count, different keys.
    expect(isEquivalent({ a: 1 }, { b: 1 })).toBe(false)
    // An array and an object are never equivalent, however similar.
    expect(isEquivalent([], {})).toBe(false)
  })

  it('refuses to compare anything with a prototype of its own', () => {
    // Both would report an empty key list, so a structural walk would call them
    // equal. Reporting "different" makes the caller write, which is what it did
    // before this guard existed.
    expect(isEquivalent(new Date(0), new Date(1))).toBe(false)
    expect(isEquivalent(new Date(0), new Date(0))).toBe(false)
    expect(isEquivalent(new Map([['a', 1]]), new Map())).toBe(false)
    expect(isEquivalent(new Set([1]), new Set([2]))).toBe(false)
    expect(isEquivalent(/a/, /b/)).toBe(false)

    class Point { constructor(public x = 1) {} }
    expect(isEquivalent(new Point(), new Point())).toBe(false)
    // ...but the identical instance is still identical.
    const point = new Point()
    expect(isEquivalent(point, point)).toBe(true)
  })

  it('terminates on cyclic state', () => {
    const a: any = { name: 'a' }
    a.self = a
    const b: any = { name: 'a' }
    b.self = b

    expect(isEquivalent(a, b)).toBe(true)

    const c: any = { name: 'c' }
    c.self = c
    expect(isEquivalent(a, c)).toBe(false)
  })

  it('handles objects created without a prototype', () => {
    const bare = Object.create(null)
    bare.a = 1
    expect(isEquivalent(bare, { a: 1 })).toBe(true)
  })
})

describe('applyState', () => {
  it('copies values across', () => {
    const target: any = { a: 1 }
    applyState(target, { a: 2, b: 3 })
    expect(target).toEqual({ a: 2, b: 3 })
  })

  it('merges into an existing object rather than replacing it', () => {
    const nested = { a: 1, b: 2 }
    const target: any = { nested }
    applyState(target, { nested: { a: 9 } })
    // Same object, updated in place — the sandbox bridge depends on this.
    expect(target.nested).toBe(nested)
    expect(target.nested).toEqual({ a: 9, b: 2 })
  })

  it('replaces the object when override is set', () => {
    const nested = { a: 1, b: 2 }
    const target: any = { nested }
    applyState(target, { nested: { a: 9 } }, true)
    expect(target.nested).not.toBe(nested)
    expect(target.nested).toEqual({ a: 9 })
  })

  it('leaves identity alone when the incoming value is equivalent', () => {
    // The behaviour #95 turns on. `toRawDeep` rebuilds every object on its way
    // through the state sync, so without this the assignment below would land a
    // new identity over an equal one and trigger every watcher on it.
    const list = [1, 2, 3]
    const nested = { a: 1 }
    const target: any = { list, nested, count: 0 }

    applyState(target, { list: [1, 2, 3], nested: { a: 1 }, count: 0 })

    expect(target.list).toBe(list)
    expect(target.nested).toBe(nested)
  })

  it('creates a key the target does not have, even when the value is undefined', () => {
    // `undefined` is equivalent to `undefined`, so the skip has to check that
    // the key exists before it trusts that. A story is allowed to declare its
    // shape upfront — `initState: () => ({ text: 'hi', pending: undefined })` —
    // and the controls panel lists the keys the state actually has.
    const target: any = {}
    applyState(target, { text: 'hi', pending: undefined })

    expect(Object.keys(target)).toEqual(['text', 'pending'])
    expect('pending' in target).toBe(true)
  })

  it('still skips an existing key whose value is already undefined', () => {
    const target: any = { pending: undefined }
    expect(applyState(target, { pending: undefined })).toBe(false)
  })

  it('still writes when only part of an equivalent-looking value differs', () => {
    const target: any = { nested: { a: 1, b: 2 } }
    applyState(target, { nested: { a: 1, b: 3 } })
    expect(target.nested).toEqual({ a: 1, b: 3 })
  })

  it('swallows writes to read-only properties', () => {
    const target: any = {}
    Object.defineProperty(target, 'ro', { get: () => 1, enumerable: true })
    expect(() => applyState(target, { ro: 2 })).not.toThrow()
    expect(target.ro).toBe(1)
  })

  it('cannot express a key removal', () => {
    // Not a wish list — every state sync in the repo is built around knowing
    // this. `applyState` iterates the incoming keys, so a key the source has
    // dropped is simply never visited and survives on the target.
    const target: any = { a: 1, gone: 2 }
    applyState(target, { a: 1 })
    expect(target.gone).toBe(2)
  })
})

// `plugin-svelte` and the sandbox bridge hold a flag meaning "ignore the next
// firing, it is the echo of my own write", and clear it when that firing
// arrives. This return value is what tells them whether a firing is coming at
// all. Report `true` when nothing moved and the flag stays set forever,
// swallowing the next real edit — which is #95. (`plugin-vue` has since dropped
// the flag for a baseline; see `createStateBaseline` below.)
describe('applyState reporting whether it wrote', () => {
  it('reports a write', () => {
    expect(applyState({ a: 1 }, { a: 2 })).toBe(true)
    expect(applyState({}, { a: 1 })).toBe(true)
    expect(applyState({ list: [1] }, { list: [1, 2] })).toBe(true)
  })

  it('reports nothing for a state that already matches', () => {
    expect(applyState({ a: 1 }, { a: 1 })).toBe(false)
    expect(applyState({ nested: { a: 1 } }, { nested: { a: 1 } })).toBe(false)
    expect(applyState({ list: [1, 2] }, { list: [1, 2] })).toBe(false)
    expect(applyState({ a: 1 }, {})).toBe(false)
  })

  it('reports nothing when a merge only drops keys it cannot drop', () => {
    // The exact shape of #95, and the case that makes the naive answer wrong.
    // `{ a: 1, b: 2 }` and `{ a: 1 }` are not equivalent, so this reaches the
    // merge — but merging leaves the target byte for byte as it was, because
    // the only difference is a key the merge has no way to remove.
    const target: any = { items: { a: 1, b: 2 } }
    expect(applyState(target, { items: { a: 1 } })).toBe(false)
    expect(target.items).toEqual({ a: 1, b: 2 })
  })

  it('reports a write when a merge does change something', () => {
    const target: any = { items: { a: 1, b: 2 } }
    expect(applyState(target, { items: { a: 9 } })).toBe(true)
    expect(target.items).toEqual({ a: 9, b: 2 })
  })

  it('reports a write it could not actually make', () => {
    // Known and deliberately left alone: a setter that silently drops the value
    // — Vue's read-only `computed` is the one that occurs in practice — still
    // counts. Getting this right means reading back after every write, and the
    // consequence of being wrong here is the pre-existing behaviour rather than
    // a new failure.
    const target: any = {}
    Object.defineProperty(target, 'ro', { get: () => 1, enumerable: true, configurable: true })
    expect(applyState(target, { ro: 2 })).toBe(true)
  })
})

describe('diffState', () => {
  it('reports nothing when the two match', () => {
    expect(diffState({ a: 1 }, { a: 1 })).toBeNull()
    expect(diffState({ nested: { a: 1 } }, { nested: { a: 1 } })).toBeNull()
    expect(diffState({ list: [1, 2] }, { list: [1, 2] })).toBeNull()
  })

  it('reports only the keys that moved', () => {
    expect(diffState({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ b: 3 })
  })

  it('reports a key the baseline has never seen', () => {
    expect(diffState({}, { a: 1 })).toEqual({ a: 1 })
    expect(diffState({}, { a: undefined })).toEqual({ a: undefined })
  })

  it('narrows a nested object to its own changed keys', () => {
    // The point of the whole exercise: what is not sent cannot be clobbered, so
    // the far side keeps its concurrent edit to `b`.
    expect(diffState({ items: { a: 1, b: 2 } }, { items: { a: 9, b: 2 } })).toEqual({ items: { a: 9 } })
  })

  it('narrows one level and no further, which is as far as applyState merges', () => {
    // `applyState` assigns what it finds at depth two, so a narrowed object there
    // would land as the whole value and drop `y`.
    expect(diffState({ deep: { inner: { x: 1, y: 2 } } }, { deep: { inner: { x: 9, y: 2 } } }))
      .toEqual({ deep: { inner: { x: 9, y: 2 } } })
  })

  it('carries an `_h` key whole, because applyState replaces rather than merges it', () => {
    // The sandbox bridge needs those replaced outright, so `applyState` sends
    // them down the assignment branch. Narrowing one would empty it.
    expect(diffState({ _hPropState: { a: 1, b: 2 } }, { _hPropState: { a: 9, b: 2 } }))
      .toEqual({ _hPropState: { a: 9, b: 2 } })
  })

  it('carries an array whole', () => {
    // `applyState` assigns arrays rather than merging them, so a partial one
    // would be read as the entire new value.
    expect(diffState({ list: [1, 2] }, { list: [1, 2, 3] })).toEqual({ list: [1, 2, 3] })
  })

  it('carries a value whole when the two sides are not both plain objects', () => {
    expect(diffState({ a: 1 }, { a: { b: 2 } })).toEqual({ a: { b: 2 } })
    expect(diffState({ a: { b: 2 } }, { a: 1 })).toEqual({ a: 1 })
  })

  it('ignores a removal, at any depth', () => {
    // Deliberate, and the reason the baseline stays usable. `applyState` cannot
    // express a removal, so reporting one produces a write that changes nothing
    // — and one the baseline would go on reporting on every later pass.
    expect(diffState({ a: 1, gone: 2 }, { a: 1 })).toBeNull()
    expect(diffState({ items: { a: 1, gone: 2 } }, { items: { a: 1 } })).toBeNull()
  })
})

describe('createStateBaseline', () => {
  it('reports everything the first time, since it has agreed to nothing yet', () => {
    const baseline = createStateBaseline()
    expect(baseline.take({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('reports nothing for a repeat, which is what makes an echo recognisable', () => {
    const baseline = createStateBaseline()
    baseline.take({ a: 1 })
    expect(baseline.take({ a: 1 })).toBeNull()
  })

  it('reports each side only its own change', () => {
    // #96 in miniature. Both sides changed a different key in the same tick, so
    // each holds one fresh value and one stale one — and is asked about the
    // fresh one alone.
    const baseline = createStateBaseline()
    baseline.take({ a: 0, b: 0 })

    expect(baseline.take({ a: 1, b: 0 })).toEqual({ a: 1 })
    expect(baseline.take({ a: 1, b: 1 })).toEqual({ b: 1 })
    expect(baseline.take({ a: 1, b: 1 })).toBeNull()
  })

  it('keeps a key the far side removed rather than replaying it', () => {
    const baseline = createStateBaseline()
    baseline.take({ a: 1, gone: 2 })

    expect(baseline.take({ a: 1 })).toBeNull()
    // Still agreed as far as the side that kept it is concerned, so it does not
    // come back the next time that side is asked.
    expect(baseline.take({ a: 1, gone: 2 })).toBeNull()
  })

  it('does not keep a reference to what it was handed', () => {
    // The caller passes the same object on to `applyState`, which assigns it
    // into a reactive state. Sharing it would let a later write land in the
    // baseline too, and an edit the baseline already knows is an edit dropped.
    const baseline = createStateBaseline()
    const next: any = { list: [1, 2], nested: { a: 1 } }
    baseline.take(next)

    next.list.push(3)
    next.nested.a = 9

    expect(baseline.take({ list: [1, 2, 3], nested: { a: 9 } }))
      .toEqual({ list: [1, 2, 3], nested: { a: 9 } })
  })

  it('survives a cyclic state', () => {
    const baseline = createStateBaseline()
    const next: any = { name: 'a' }
    next.self = next

    expect(() => baseline.take(next)).not.toThrow()
    expect(baseline.take(next)).toBeNull()
  })

  it('survives a cyclic state that changes', () => {
    // The harder half. `isEquivalent` short-circuits an unchanged cycle before
    // the diff ever recurses; a changed one gets past it, and then meets the
    // same pair on every lap.
    const baseline = createStateBaseline()
    const first: any = { name: 'a' }
    first.self = first
    baseline.take(first)

    const second: any = { name: 'b' }
    second.self = second

    // `self.name` did genuinely move, so it is reported at that path too. The
    // walk terminates because it stops after one level, not because a cycle is
    // detected — below that the value is carried whole, cycle and all.
    expect(baseline.take(second)).toEqual({ name: 'b', self: { name: 'b', self: second } })
    expect(baseline.take(second)).toBeNull()
  })
})
