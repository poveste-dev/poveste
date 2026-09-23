import { describe, expect, it } from 'vitest'
import { checkControlConventions, NOT_YET_MIGRATED, problemsIn } from './control-conventions.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

function control(template: string, style = '') {
  return `<template>${template}</template><style lang="postcss">${style}</style>`
}

describe('a part a consumer can reach', () => {
  it('fails when a migrated control names none', () => {
    const files = [{ file: 'button/HstThing.vue', source: control('<button class="poveste-thing">go</button>') }]

    expect(problemsIn(files)).toEqual([
      'button/HstThing.vue: no `data-slot` on any part, so a consumer has only our class names to target',
    ])
  })

  it('passes once one is named', () => {
    const files = [{ file: 'button/HstThing.vue', source: control('<button data-slot="button">go</button>') }]

    expect(problemsIn(files)).toEqual([])
  })

  it('says nothing about a control with no template of its own', () => {
    const files = [{ file: 'button/HstThing.vue', source: '<script setup lang="ts"></script>' }]

    expect(problemsIn(files)).toEqual([])
  })
})

describe('a colour a book cannot theme', () => {
  it('fails on a hex', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { color: #10b981; }') }]

    expect(problemsIn(files)).toEqual(['a/HstThing.vue: opaque colour literal `#10b981` — no book can theme that'])
  })

  it('fails on an opaque rgb', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { color: rgb(1 2 3); }') }]

    expect(problemsIn(files)).toEqual(['a/HstThing.vue: opaque colour literal `rgb(1 2 3)` — no book can theme that'])
  })

  it('allows a translucent one, which is a wash rather than a brand colour', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { border-color: rgb(0 0 0 / .25); }') }]

    expect(problemsIn(files)).toEqual([])
  })

  it('allows a token', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { color: var(--color-primary-500); }') }]

    expect(problemsIn(files)).toEqual([])
  })

  it('does not read an issue reference as a hex', () => {
    // `(#101)` is three hex digits to a regex, and this codebase cites issues
    // in comments constantly.
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '/* see #101 and #955 */ .x { color: var(--color-white); }') }]

    expect(problemsIn(files)).toEqual([])
  })
})

describe('the not-yet-migrated list', () => {
  it('exempts a control on it', () => {
    const files = [{ file: 'text/HstText.vue', source: control('<input class="poveste-text">', '.poveste-text { color: #333; }') }]

    expect(problemsIn(files)).toEqual([])
  })

  it('still holds every control #955 has moved', () => {
    // A control leaves the list when it migrates. If one that has already moved
    // is still on it, the check is exempting something it should be holding.
    for (const migrated of ['HstCheckbox.vue', 'HstCheckboxList.vue', 'HstSimpleCheckbox.vue', 'HstButton.vue', 'HstButtonGroup.vue']) {
      expect(NOT_YET_MIGRATED.has(migrated)).toBe(false)
    }
  })
})

describe('checkControlConventions', () => {
  it('reports that it found no controls, rather than passing over an empty walk', () => {
    const root = tree({ 'packages/poveste-controls/src/components/': '' })

    expect(checkControlConventions(root).problems).toEqual([
      'no controls found under packages/poveste-controls/src/components — this check is looking in the wrong place',
    ])
  })

  it('reports a list that has swallowed every control', () => {
    const root = tree({ 'packages/poveste-controls/src/components/text/HstText.vue': '<template><input></template>' })

    expect(checkControlConventions(root).problems).toEqual([
      'every control is on the not-yet-migrated list — this check is asserting nothing',
    ])
  })
})

describe('this repository', () => {
  it('writes its controls to the conventions', { tags: ['check', 'controls'] }, () => {
    assertNoProblems(checkControlConventions())
  })
})
