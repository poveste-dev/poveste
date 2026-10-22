import { describe, expect, it } from 'vitest'
import { checkControlConventions, problemsIn } from './control-conventions.ts'
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
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { color: var(--_poveste-primary-500); }') }]

    expect(problemsIn(files)).toEqual([])
  })

  it('does not read an issue reference as a hex', () => {
    // `(#101)` is three hex digits to a regex, and this codebase cites issues
    // in comments constantly.
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '/* see #101 and #955 */ .x { color: var(--_poveste-white); }') }]

    expect(problemsIn(files)).toEqual([])
  })
})

describe('a dark variant that compiles to nothing', () => {
  it('fails on a `dark:` inside `@apply`', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x::-webkit-slider-thumb { @apply bg-white dark:bg-gray-700; }') }]

    expect(problemsIn(files)).toEqual([
      'a/HstThing.vue: a `dark:` variant inside `@apply`, which composes into the surrounding selector and fails silently where it cannot — after a pseudo-element, and under `@scope`',
    ])
  })

  it('passes the same colours written as CSS on the subject', () => {
    const style = `.x:where(.ptw-dark, .ptw-dark *)::-webkit-slider-thumb { background: var(--_poveste-gray-700); }`
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', style) }]

    expect(problemsIn(files)).toEqual([])
  })

  it('says nothing about an `@apply` with no dark variant in it', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { @apply flex items-center; }') }]

    expect(problemsIn(files)).toEqual([])
  })

  // The codebase writes `dark:` in prose constantly, including in the comments
  // explaining why not to use it.
  it('does not read a `dark:` in a comment as one in an `@apply`', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '/* never `@apply dark:bg-gray-700` here */ .x { color: var(--_poveste-white); }') }]

    expect(problemsIn(files)).toEqual([])
  })
})

// A sandboxed story's realm loads the controls' component CSS and none of the chrome's (#1443).
describe('a token a sandboxed story does not define', () => {
  it('fails on the chrome\'s colour and radius tokens', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { color: var(--color-gray-200); border-radius: var(--radius-sm); }') }]

    expect(problemsIn(files)).toEqual([
      'a/HstThing.vue: reads the chrome\'s `--color-gray-200`, `--radius-sm`, which a sandboxed story does not define — read `--_poveste-…` instead',
    ])
  })

  it('allows the controls\' own', () => {
    const files = [{ file: 'a/HstThing.vue', source: control('<b data-slot="x" />', '.x { color: var(--_poveste-gray-200); border-radius: var(--_poveste-radius-sm); }') }]

    expect(problemsIn(files)).toEqual([])
  })
})

describe('checkControlConventions', () => {
  it('reports that it found no controls, rather than passing over an empty walk', () => {
    const root = tree({ 'packages/poveste-controls/src/components/': '' })

    expect(checkControlConventions(root).problems).toEqual([
      'no controls found under packages/poveste-controls/src/components — this check is looking in the wrong place',
    ])
  })
})

describe('this repository', () => {
  it('writes its controls to the conventions', { tags: ['check', 'controls'] }, () => {
    assertNoProblems(checkControlConventions())
  })
})
