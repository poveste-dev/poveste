import { isEquivalent } from '@poveste/shared'
import { describe, expect, it } from 'vitest'
import { markRaw, reactive } from 'vue'
import { toRawDeep } from '../app/util/state'

/**
 * What the walker does to a value that is not a plain object.
 *
 * `postMessage` is structured clone, so structured clone is the boundary that
 * actually exists — and it carries `Date`, `Map`, `Set`, `RegExp`, `Error`,
 * typed arrays and `BigInt` intact. The walker flattened all of them to `{}`
 * before the transport was ever reached, so the question is not which types to
 * support but which ones we were destroying on the way (#977).
 */
class Point {
  constructor(public x: number, public y: number) {}
  get len() { return Math.hypot(this.x, this.y) }
}

describe('a value the transport can carry', () => {
  it('keeps a Date, rather than emptying it', () => {
    const out = toRawDeep({ at: new Date(1790071200000) }, true)

    expect(out.at).toBeInstanceOf(Date)
    expect(out.at.getTime()).toBe(1790071200000)
  })

  it('keeps a Map and a Set with their contents', () => {
    const out = toRawDeep({ m: new Map([['a', 1]]), s: new Set([1, 2, 3]) }, true)

    expect(out.m).toBeInstanceOf(Map)
    expect(out.m.get('a')).toBe(1)
    expect(out.s).toBeInstanceOf(Set)
    expect(out.s.size).toBe(3)
  })

  it('keeps a RegExp and an Error', () => {
    const out = toRawDeep({ re: /ab+c/gi, err: new Error('boom') }, true)

    expect(out.re).toBeInstanceOf(RegExp)
    expect(out.re.source).toBe('ab+c')
    expect(out.err).toBeInstanceOf(Error)
    expect(out.err.message).toBe('boom')
  })

  it('keeps a typed array as one, rather than as an index map', () => {
    const out = toRawDeep({ bytes: new Uint8Array([1, 2, 3]) }, true)

    expect(out.bytes).toBeInstanceOf(Uint8Array)
    expect([...out.bytes]).toEqual([1, 2, 3])
  })

  it('detaches it, so a later mutation does not reach the copy', () => {
    const at = new Date(1790071200000)
    const out = toRawDeep({ at }, true)

    at.setTime(0)

    expect(out.at.getTime()).toBe(1790071200000)
  })
})

describe('a value the transport refuses', () => {
  it('drops a URL rather than flattening it, the way a function is dropped', () => {
    // Structured clone throws `DataCloneError` on a `URL`. Passing it through
    // would turn a silent flattening into a thrown exception mid-sync, which is
    // worse than what it replaces.
    const out = toRawDeep({ href: new URL('https://poveste.dev/a'), kept: 1 }, true)

    expect(Object.hasOwn(out, 'href')).toBe(false)
    expect(out.kept).toBe(1)
  })

  it('leaves what it did send intact', () => {
    const out = toRawDeep({ before: 1, href: new URL('https://poveste.dev/a'), after: 2 }, true)

    expect(out).toEqual({ before: 1, after: 2 })
  })
})

describe('a class instance', () => {
  // Structured clone carries own fields and drops the prototype, so "faithful"
  // has no meaning here. Plain is the answer, and it is now a stated one.
  it('arrives as plain data, with its fields but not its accessors', () => {
    const out = toRawDeep({ p: new Point(3, 4) }, true)

    expect(out.p).toEqual({ x: 3, y: 4 })
    expect(out.p.len).toBeUndefined()
  })
})

describe('the two halves of the sync agree', () => {
  // `isEquivalent` refuses to compare anything that is not a plain object,
  // because "two distinct `Date`s would otherwise compare equal on an empty key
  // list". That defence could not fire: it is handed the walker's output, and
  // by then the `Date` was already `{}` (#977).
  it('so two different dates are not equivalent after the walk', () => {
    const a = toRawDeep({ at: new Date(1790071200000) }, true)
    const b = toRawDeep({ at: new Date(0) }, true)

    expect(isEquivalent(a, b)).toBe(false)
  })

  it('and the in-realm walk carries one by reference, which `Object.is` settles', () => {
    const at = new Date(1790071200000)

    expect(toRawDeep({ at }, false).at).toBe(at)
  })
})

describe('a value that is reactive, which state always is', () => {
  // The one that would have shipped a second silent failure. Vue proxies `Map`
  // and `Set` but not `Date`, `RegExp`, `Error` or typed arrays, and
  // `structuredClone` throws `DataCloneError` on the proxy while the raw
  // object clones fine. Without `toRaw` a `Map` in reactive state is refused
  // here and dropped — a different silence, not a fix for the first.
  it('clones a reactive Map rather than refusing it', () => {
    const state = reactive({ m: new Map([['a', 1]]) })

    const out = toRawDeep(state, true)

    expect(out.m).toBeInstanceOf(Map)
    expect(out.m.get('a')).toBe(1)
  })

  it('clones a reactive Set the same way', () => {
    const out = toRawDeep(reactive({ s: new Set([1, 2]) }), true)

    expect(out.s).toBeInstanceOf(Set)
    expect(out.s.size).toBe(2)
  })

  it('and a reactive Date, which Vue does not proxy', () => {
    const out = toRawDeep(reactive({ at: new Date(1790071200000) }), true)

    expect(out.at.getTime()).toBe(1790071200000)
  })
})

describe('this walk\'s own rules reach inside a Map and a Set', () => {
  // An array already comes out shorter for a function or a marked value. A
  // container is the same problem, and answering it by refusing the whole
  // `Map` would lose the keys beside it.
  it('drops a function from a Map, and keeps the rest', () => {
    const out = toRawDeep({ m: new Map<string, any>([['fn', () => {}], ['kept', 1]]) }, true)

    expect(out.m.has('fn')).toBe(false)
    expect(out.m.get('kept')).toBe(1)
  })

  it('drops a marked value from a Set, and keeps the rest', () => {
    const out = toRawDeep({ s: new Set([markRaw({ heavy: true }), 'kept']) }, true)

    expect([...out.s]).toEqual(['kept'])
  })

  it('survives a cycle that runs through a Map', () => {
    const root: Record<string, any> = { name: 'root' }
    root.m = new Map([['back', root]])

    const out = toRawDeep(root, true)

    expect(out.m.get('back')).toBe(out)
  })
})

describe('identity inside one walk', () => {
  it('gives one Date appearing twice the same copy, as the transport would', () => {
    const at = new Date(1790071200000)

    const out = toRawDeep({ a: at, b: at }, true)

    expect(out.a).toBe(out.b)
  })
})
