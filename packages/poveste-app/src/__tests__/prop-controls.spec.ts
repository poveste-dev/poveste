import type { AutoPropComponentDefinition, ComponentDoc, DocProp } from '@poveste/shared'
import type { ComponentDocsEntry } from '../app/util/component-docs'
import { describe, expect, it } from 'vitest'
import { controlOf, defaultShown, docOf } from '../app/util/prop-controls'

const docProp = (name: string, control?: DocProp['control']): DocProp => ({ name, type: 'x', required: false, tags: [], ...control ? { control } : {} })
const doc = (...props: DocProp[]): ComponentDoc => ({ props, slots: [], events: [] })
const entry = (file: string, name: string, componentDoc: ComponentDoc): ComponentDocsEntry => ({ file, name, doc: componentDoc })
const def = (name: string, file?: string): AutoPropComponentDefinition => ({ name, index: 0, props: [], ...file ? { file } : {} })

const BUTTON = doc(docProp('size', { kind: 'select', options: ['s', 'm'] }))
const OTHER = doc(docProp('size', { kind: 'number' }))

describe('the docs a rendered component\'s controls are read from', () => {
  it('are its file\'s, when the plugin knows the file', () => {
    const entries = [entry('src/a/Button.vue', 'Button', OTHER), entry('src/b/Button.vue', 'Button', BUTTON)]

    expect(docOf(def('Button', 'src/b/Button.vue'), entries, [def('Button', 'src/b/Button.vue')])).toBe(BUTTON)
  })

  it('are none when its known file is not documented, even if another file shares its name', () => {
    const entries = [entry('src/Button.vue', 'Button', BUTTON)]

    expect(docOf(def('Button', 'node_modules/lib/Button.vue'), entries, [def('Button', 'node_modules/lib/Button.vue')])).toBeUndefined()
  })

  // A built Vue book sets `__file` to the base name only.
  it('are the one documented file of its base name, when only that is known', () => {
    expect(docOf(def('Button', 'Button.vue'), [entry('src/a/Button.vue', 'Button', BUTTON)], [def('Button', 'Button.vue')])).toBe(BUTTON)
  })

  it('are none when two documented files share its base name', () => {
    const entries = [entry('src/a/Button.vue', 'Button', OTHER), entry('src/b/Button.vue', 'Button', BUTTON)]

    expect(docOf(def('Button', 'Button.vue'), entries, [def('Button', 'Button.vue')])).toBeUndefined()
  })

  it('are the one documented component of its name, when the file is unknown', () => {
    expect(docOf(def('Button'), [entry('src/Button.vue', 'Button', BUTTON)], [def('Button')])).toBe(BUTTON)
  })

  it('are none when two documented components share its name and the file is unknown', () => {
    const entries = [entry('src/a/Button.vue', 'Button', OTHER), entry('src/b/Button.vue', 'Button', BUTTON)]

    expect(docOf(def('Button'), entries, [def('Button')])).toBeUndefined()
  })

  it('are none when the story renders two components of that name and the file is unknown', () => {
    const rendered = [def('Button'), { ...def('Button'), index: 1 }]

    expect(docOf(rendered[1]!, [entry('src/Button.vue', 'Button', BUTTON)], rendered)).toBeUndefined()
  })
})

describe('the control an automatic prop gets', () => {
  const prop = (name: string, types?: string[]) => ({ name, ...types ? { types } : {} })

  it('is the type\'s select, with its options, over the runtime text field', () => {
    expect(controlOf(prop('size', ['string']), BUTTON, undefined)).toEqual({
      kind: 'select',
      options: [{ label: 's', value: 's' }, { label: 'm', value: 'm' }],
      from: 'type',
    })
  })

  it('is what the runtime carries when the type picks nothing', () => {
    expect(controlOf(prop('label', ['string']), doc(docProp('label')), undefined)).toEqual({ kind: 'text', from: 'runtime' })
  })

  it('is what the runtime carries with no docs', () => {
    expect(controlOf(prop('open', ['boolean']), undefined, undefined)).toEqual({ kind: 'checkbox', from: 'runtime' })
  })

  it('is the story\'s, over the type', () => {
    expect(controlOf(prop('size', ['string']), BUTTON, { size: 'text' })).toEqual({ kind: 'text', from: 'story' })
  })

  it('is the story\'s select with its options, labelled or not', () => {
    expect(controlOf(prop('size'), undefined, { size: { control: 'select', options: ['s', { label: 'Large', value: 'l' }] } })).toEqual({
      kind: 'select',
      options: [{ label: 's', value: 's' }, { label: 'Large', value: 'l' }],
      from: 'story',
    })
  })

  it('is the story\'s slider with its range', () => {
    expect(controlOf(prop('level'), undefined, { level: { control: 'slider', min: 1, max: 6, step: 1 } })).toEqual({ kind: 'slider', min: 1, max: 6, step: 1, from: 'story' })
  })

  it('is none when the story hides the prop', () => {
    expect(controlOf(prop('size', ['string']), BUTTON, { size: false })).toBeUndefined()
  })
})

// A checkbox, a select and a slider have no placeholder, so they show the default as
// their value until the reader sets one; the others keep it as a placeholder (#1698).
describe('the default a control shows before the reader sets anything', () => {
  const SHAPE = { kind: 'select', options: [{ label: 'Round', value: 'round' }, { label: 'Square', value: 'square' }] } as const

  it('is a boolean\'s, on a checkbox, whichever source picked it', () => {
    for (const from of ['story', 'type', 'runtime'] as const) {
      expect(defaultShown({ kind: 'checkbox', from }, true)).toBe(true)
    }
    expect(defaultShown({ kind: 'checkbox', from: 'runtime' }, false)).toBe(false)
  })

  it('is one of a select\'s options, from the type or the story', () => {
    expect(defaultShown({ ...SHAPE, from: 'type' }, 'round')).toBe('round')
    expect(defaultShown({ ...SHAPE, from: 'story' }, 'square')).toBe('square')
  })

  it('is a number, on a slider', () => {
    expect(defaultShown({ kind: 'slider', min: 1, max: 6, from: 'story' }, 3)).toBe(3)
  })

  it('is none that the control cannot hold', () => {
    expect(defaultShown({ kind: 'checkbox', from: 'type' }, 'true')).toBeUndefined()
    expect(defaultShown({ ...SHAPE, from: 'type' }, 'oval')).toBeUndefined()
    // A Vue factory default reaches the panel as its source text.
    expect(defaultShown({ kind: 'slider', min: 1, max: 6, from: 'story' }, '() => 3')).toBeUndefined()
  })

  it('is none on a control that shows a placeholder instead', () => {
    expect(defaultShown({ kind: 'text', from: 'type' }, 'Hello')).toBeUndefined()
    expect(defaultShown({ kind: 'number', from: 'runtime' }, 3)).toBeUndefined()
  })
})
