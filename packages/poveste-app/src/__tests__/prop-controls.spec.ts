import type { AutoPropComponentDefinition, ComponentDoc, DocProp } from '@poveste/shared'
import type { ComponentDocsEntry } from '../app/util/component-docs'
import { describe, expect, it } from 'vitest'
import { controlOf, docOf } from '../app/util/prop-controls'

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
