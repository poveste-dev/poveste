import { describe, expect, it } from 'vitest'
import { computed, readonly, ref, shallowRef, useTemplateRef } from 'vue'
import { isWritableBinding } from '../util.js'

// `useTemplateRef` returns a readonly ref in a dev build and a writable one in a
// production build, so this file is the only place the defect in #959 can be
// caught: vitest runs the dev build, and the e2e suites serve built books where
// the bug does not exist.

describe('isWritableBinding', () => {
  it('rejects the ref useTemplateRef returns, which is what loops the sync', () => {
    expect(isWritableBinding(useTemplateRef('el'))).toBe(false)
  })

  it('rejects a readonly ref however it was made', () => {
    expect(isWritableBinding(readonly(ref(0)))).toBe(false)
    expect(isWritableBinding(readonly(shallowRef(null)))).toBe(false)
  })

  // Same rule, and the reason is the same: a control that cannot write is not a
  // control. Called out because it is a behaviour change beyond the defect.
  it('rejects a computed, which could never take the write either', () => {
    expect(isWritableBinding(computed(() => 1))).toBe(false)
  })

  // The shape every existing story uses for a template ref, which has to keep
  // working — a story that writes its own state through one still syncs.
  it('accepts the pre-3.5 ref(null) form', () => {
    expect(isWritableBinding(ref(null))).toBe(true)
    expect(isWritableBinding(shallowRef(null))).toBe(true)
  })

  it('accepts ordinary bindings, ref and plain alike', () => {
    expect(isWritableBinding(ref(0))).toBe(true)
    expect(isWritableBinding({ a: 1 })).toBe(true)
    expect(isWritableBinding('text')).toBe(true)
    expect(isWritableBinding(undefined)).toBe(true)
  })
})
