import { EditorView } from '@codemirror/view'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick, reactive, ref } from 'vue'
import HstJson from './HstJson.vue'
import { serializeState, stringifyState } from './serialize.js'

describe('stringifyState', () => {
  it('matches JSON.stringify on values JSON can express', () => {
    const value = { a: 1, b: 'two', c: [1, 2], d: { e: null }, f: true }
    expect(stringifyState(value)).toBe(JSON.stringify(value))
    expect(stringifyState(value, 2)).toBe(JSON.stringify(value, null, 2))
  })

  it('names a cycle instead of throwing', () => {
    // The ComplexParameter story in the vue example holds exactly this, and
    // once the state sync started delivering the story's own scope it reached
    // the editor. `JSON.stringify` throws here, from a lifecycle hook, taking
    // the rest of the flush — the panel and the toolbar — down with it.
    const parent: any = { name: 'hello' }
    const child: any = { parent }
    parent.child = child

    expect(JSON.parse(stringifyState(parent))).toEqual({
      name: 'hello',
      child: { parent: '[Circular]' },
    })
  })

  it('names a function, which JSON.stringify drops silently', () => {
    expect(JSON.parse(stringifyState({ action: () => {} }))).toEqual({ action: '[Function]' })
  })

  it('does not mistake a shared reference for a cycle', () => {
    // The guard tracks ancestors, not everything seen. The same object twice as
    // a sibling serialises fine and must not be blanked out.
    const shared = { a: 1 }
    expect(JSON.parse(stringifyState({ x: shared, y: shared }))).toEqual({ x: { a: 1 }, y: { a: 1 } })
  })

  it('stops walking a graph whose shared references multiply', () => {
    // Shared references are walked each time they appear, so a graph that
    // shares one object between two keys at every level doubles per level. A
    // `useNuxtApp()` in a story's scope is that shape, and walking it froze the
    // renderer — iframe included — for as long as anyone waited (#788).
    let level: any = { leaf: true }
    for (let i = 0; i < 40; i++) {
      level = { left: level, right: level }
    }

    const started = performance.now()
    const document = stringifyState(level)

    expect(performance.now() - started).toBeLessThan(1000)
    expect(document).toContain('[Truncated]')
  })

  it('names a node rather than walking it', () => {
    const el = document.createElement('div')
    expect(JSON.parse(stringifyState({ el }))).toEqual({ el: '[Node]' })
  })

  it('names a bigint, which no JSON number can hold', () => {
    expect(JSON.parse(stringifyState({ n: 10n }))).toEqual({ n: '[BigInt 10]' })
  })

  it('names the types JSON.stringify would quietly flatten', () => {
    // Each of these writes out as something a reader would take for an ordinary
    // value: a `Date` as a quoted string, a `Map` and a `RegExp` as `{}`. The
    // name has to carry what the type is about, or naming it costs the reader
    // the only thing they could see before.
    class Point {
      constructor(public x: number, public y: number) {}
    }

    expect(JSON.parse(stringifyState({
      at: new Date(1790071200000),
      m: new Map([['a', 1], ['b', 2]]),
      s: new Set([1, 2, 3]),
      re: /ab+c/gi,
      err: new TypeError('boom'),
      bytes: new Uint8Array([1, 2, 3]),
      url: new URL('https://poveste.dev/a'),
      p: new Point(3, 4),
    }))).toEqual({
      at: '[Date 2026-09-22T10:00:00.000Z]',
      m: '[Map(2)]',
      s: '[Set(3)]',
      re: '[RegExp /ab+c/gi]',
      err: '[TypeError: boom]',
      bytes: '[Uint8Array(3)]',
      url: '[URL https://poveste.dev/a]',
      p: '[Point]',
    })
  })

  it('names a value held at the root, which has no holder of its own', () => {
    // `JSON.stringify` hands the replacer a `{ '': value }` wrapper for the root
    // and calls `toJSON` before it, so a root `Date` reaches it already a
    // string. Read from the wrapper rather than from what was handed over.
    expect(JSON.parse(stringifyState(new Date(1790071200000)))).toBe('[Date 2026-09-22T10:00:00.000Z]')
  })

  it('reports a plain document as the value, and a named one as a view of it', () => {
    expect(serializeState({ a: 1, b: [2, 3], c: null }).faithful).toBe(true)
    expect(serializeState({ a: 1, at: new Date() }).faithful).toBe(false)
    expect(serializeState({ a: 1, action: () => {} }).faithful).toBe(false)
  })

  it('reads a getter once, however many times the replacer looks', () => {
    // Recovering what `toJSON` hid must not cost a second invocation. State is
    // user data: a getter is free to count its reads, to throw the second time
    // round, or to be a `computed` whose recomputation is the expensive thing.
    let reads = 0
    const counted = {
      get once() {
        reads++
        return 1
      },
    }

    expect(JSON.parse(stringifyState(counted))).toEqual({ once: 1 })
    expect(reads).toBe(1)
  })

  it('names a Date a reactive proxy unwrapped out of a ref', () => {
    // Story state is reactive, and `reactive` unwraps a `ref` on `get` — so the
    // property descriptor behind the proxy holds the `ref`, not the `Date`.
    // Reading the descriptor's value instead of the holder would name it after
    // Vue's wrapper class.
    const state = reactive({ at: ref(new Date(1790071200000)) })

    expect(JSON.parse(stringifyState(state))).toEqual({ at: '[Date 2026-09-22T10:00:00.000Z]' })
  })

  it('names a cycle reached through a holder that answers twice differently', () => {
    // The replacer records the value it *returns*, because that is what
    // `JSON.stringify` walks and hands to the children as their holder.
    // Recording anything else — the second read of a getter handing back a
    // fresh array each time — unwinds the stack against a node that is not on
    // it, pops the real ancestors with it, and leaves the guard blind. The
    // cycle below then reaches `JSON.stringify`'s own detection, which throws
    // from inside a lifecycle hook: the exact failure this file exists to stop.
    const root: any = { name: 'root' }
    const inner: any = { back: root }
    root.branch = {
      get list() { return [inner] },
    }

    expect(stringifyState(root)).toContain('[Circular]')
  })
})

describe('hstJson round-trip', () => {
  it('does not write its own markers back into the model', async () => {
    // The markers stand for what JSON cannot carry. Parsing the rendered
    // document and emitting it replaces the thing itself with its label — a
    // cycle in the story's state becomes the string `[Circular]` — and it used
    // to happen on mount, with nobody touching the editor.
    const parent: any = { name: 'hello' }
    parent.child = { parent }

    const wrapper = mount(HstJson, { props: { modelValue: parent, title: 'Recursive' } })
    await nextTick()

    await wrapper.setProps({ modelValue: { ...parent, name: 'changed' } })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not write a truncated document back into the model', async () => {
    // Past the budget the rows it left out read `[Truncated]`, so parsing an
    // edited document would replace them with that string.
    const rows = Array.from({ length: 6000 }, (_, index) => ({ index }))
    const wrapper = mount(HstJson, { props: { modelValue: rows, title: 'Rows' } })
    await nextTick()

    const view = EditorView.findFromDOM(wrapper.find('.cm-content').element as HTMLElement)!
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: view.state.doc.toString().replace('"index": 0', '"index": 1') } })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(view.state.facet(EditorView.editable)).toBe(false)
  })

  it('does not write a named value back into the model', async () => {
    // The whole of #977's second half: the panel rendered a `Date` as a quoted
    // ISO string, and a reader editing that row replaced the story's `Date`
    // with a plain string — destroying the type the transport had just been
    // fixed to carry.
    const wrapper = mount(HstJson, { props: { modelValue: { at: new Date(1790071200000) }, title: 'Types' } })
    await nextTick()

    const view = EditorView.findFromDOM(wrapper.find('.cm-content').element as HTMLElement)!
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '{ "at": "2001-01-01T00:00:00.000Z" }' } })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(view.state.facet(EditorView.editable)).toBe(false)
    expect(wrapper.find('.poveste-json-read-only').exists()).toBe(true)
  })

  it('clears a stale JSON error when the document turns read-only', async () => {
    // Typing something unparseable sets the warning. If the story then puts a
    // `Date` in that key the row goes read-only, and no edit can reach the
    // reset any more — so the reset has to happen before the early return, or
    // the row keeps a warning it can never lose.
    const wrapper = mount(HstJson, { props: { modelValue: { a: 1 }, title: 'Plain' } })
    await nextTick()

    const view = EditorView.findFromDOM(wrapper.find('.cm-content').element as HTMLElement)!
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '{ "a": ' } })
    await nextTick()
    expect(wrapper.find('.poveste-json-invalid').exists()).toBe(true)

    await wrapper.setProps({ modelValue: { a: new Date(1790071200000) } })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.find('.poveste-json-invalid').exists()).toBe(false)
    expect(wrapper.find('.poveste-json-read-only').exists()).toBe(true)
  })

  it('still reports a document the reader changed', async () => {
    // The guard is keyed on the exact text this control last rendered, so it
    // must not swallow anything else. Without this, suppressing the echo would
    // quietly turn the editor read-only and the test above would still pass.
    const wrapper = mount(HstJson, { props: { modelValue: { a: 1 }, title: 'Plain' } })
    await nextTick()

    const view = EditorView.findFromDOM(wrapper.find('.cm-content').element as HTMLElement)!
    expect(view).toBeTruthy()

    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '{ "a": 2 }' } })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ a: 2 }])
  })
})
