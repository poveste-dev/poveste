import { EditorView } from '@codemirror/view'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import HstJson from './HstJson.vue'
import { stringifyState } from './serialize.js'

describe('stringifyState', () => {
  it('matches JSON.stringify on values JSON can express', () => {
    const value = { a: 1, b: 'two', c: [1, 2], d: { e: null }, f: true }
    expect(stringifyState(value)).toBe(JSON.stringify(value))
    expect(stringifyState(value, 2)).toBe(JSON.stringify(value, null, 2))
  })

  it('names a cycle instead of throwing', () => {
    // The ComplexParameter story in the vue3 example holds exactly this, and
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

  it('names a node rather than walking it', () => {
    const el = document.createElement('div')
    expect(JSON.parse(stringifyState({ el }))).toEqual({ el: '[Node]' })
  })

  it('carries a bigint across as its digits', () => {
    expect(JSON.parse(stringifyState({ n: 10n }))).toEqual({ n: '10' })
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
