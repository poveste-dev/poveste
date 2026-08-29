import { describe, expect, it } from 'vitest'
import { extractPropDefs } from './props'

function component(script: string, markup = '<div />'): string {
  return `<script lang="ts">\n${script}\n</script>\n${markup}`
}

describe('extractPropDefs, legacy mode', () => {
  it('reads name, type and default from an export let', () => {
    expect(extractPropDefs(component(`export let size: string = 'medium'`)))
      .toEqual([{ name: 'size', types: ['string'], required: false, default: 'medium' }])
  })

  it('marks a prop with no initialiser required', () => {
    expect(extractPropDefs(component('export let label: string')))
      .toEqual([{ name: 'label', types: ['string'], required: true, default: undefined }])
  })

  it('reads every declarator, including several on one line', () => {
    expect(extractPropDefs(component('export let a = 1, b = 2')).map(p => p.name))
      .toEqual(['a', 'b'])
  })

  it('ignores export const and export function, which are not props', () => {
    // Svelte exposes these as read-only accessors, so offering a control for
    // them would produce a control that cannot change anything.
    expect(extractPropDefs(component('export const version = 1\nexport function focus() {}')))
      .toEqual([])
  })

  it('ignores a plain local let', () => {
    expect(extractPropDefs(component('let internal = 1'))).toEqual([])
  })
})

describe('extractPropDefs, runes mode', () => {
  it('resolves types and optionality through a Props interface', () => {
    const source = component(`
  interface Props {
    label?: string
    count: number
  }
  let { label = 'Click me', count }: Props = $props()`)

    expect(extractPropDefs(source)).toEqual([
      { name: 'label', types: ['string'], required: false, default: 'Click me' },
      { name: 'count', types: ['number'], required: true, default: undefined },
    ])
  })

  it('resolves a type alias as well as an interface', () => {
    const source = component(`
  type Props = { open: boolean }
  let { open }: Props = $props()`)

    expect(extractPropDefs(source))
      .toEqual([{ name: 'open', types: ['boolean'], required: true, default: undefined }])
  })

  it('reads an inline type literal annotation', () => {
    const source = component(`let { open }: { open?: boolean } = $props()`)

    expect(extractPropDefs(source))
      .toEqual([{ name: 'open', types: ['boolean'], required: false, default: undefined }])
  })

  it('keeps a prop the component never destructures', () => {
    // The interface is the component's contract; a prop it forwards rather than
    // reads is still a prop, and only the annotation knows about it.
    const source = component(`
  interface Props { shown: string, forwarded?: number }
  let { shown }: Props = $props()`)

    expect(extractPropDefs(source).map(p => p.name)).toEqual(['shown', 'forwarded'])
  })

  it('falls back to the destructuring when there is no annotation', () => {
    const source = component(`let { label = 'hi', count } = $props()`)

    expect(extractPropDefs(source)).toEqual([
      { name: 'label', required: false, default: 'hi' },
      { name: 'count', required: true, default: undefined },
    ])
  })

  it('treats a default as satisfying a required prop', () => {
    // `count: number` is not optional in the interface, but the destructuring
    // supplies a value, so the component renders without one.
    const source = component(`
  interface Props { count: number }
  let { count = 0 }: Props = $props()`)

    expect(extractPropDefs(source)[0]).toMatchObject({ required: false, default: 0 })
  })
})

describe('extractPropDefs, type mapping', () => {
  const typesOf = (annotation: string) =>
    extractPropDefs(component(`export let value: ${annotation}`))[0]?.types

  it('maps the primitives the controls panel switches on', () => {
    expect(typesOf('string')).toEqual(['string'])
    expect(typesOf('number')).toEqual(['number'])
    expect(typesOf('boolean')).toEqual(['boolean'])
  })

  it('maps arrays, in both spellings', () => {
    expect(typesOf('string[]')).toEqual(['array'])
    expect(typesOf('Array<string>')).toEqual(['array'])
  })

  it('collapses a literal union to its underlying type', () => {
    expect(typesOf(`'small' | 'medium' | 'large'`)).toEqual(['string'])
  })

  it('drops the nullish members an optional prop carries', () => {
    expect(typesOf('string | undefined')).toEqual(['string'])
    expect(typesOf('string | null')).toEqual(['string'])
  })

  it('keeps both sides of a genuinely mixed union', () => {
    expect(typesOf('string | number')).toEqual(['string', 'number'])
  })

  it('maps an object literal, and anything it cannot read, to something HstJson can show', () => {
    expect(typesOf('{ a: string }')).toEqual(['object'])
    expect(typesOf('SomeImportedType')).toEqual(['unknown'])
    expect(typesOf('() => void')).toEqual(['unknown'])
  })

  it('leaves types undefined when the prop is not annotated', () => {
    expect(extractPropDefs(component('export let value = 1'))[0].types).toBeUndefined()
  })
})

describe('extractPropDefs, defaults', () => {
  const defaultOf = (init: string) =>
    extractPropDefs(component(`export let value = ${init}`))[0]?.default

  it('keeps literal values as values, not source text', () => {
    expect(defaultOf('1')).toBe(1)
    expect(defaultOf('true')).toBe(true)
    expect(defaultOf(`'hi'`)).toBe('hi')
    expect(defaultOf('-1')).toBe(-1)
  })

  it('drops an expression default rather than reporting its source', () => {
    // `{}` as the string "{}" would land in a control as text, which is worse
    // than showing no default at all.
    expect(defaultOf('{}')).toBeUndefined()
    expect(defaultOf('() => {}')).toBeUndefined()
    expect(defaultOf('makeIt()')).toBeUndefined()
  })
})

describe('extractPropDefs, resilience', () => {
  it('returns nothing for a component with no script', () => {
    expect(extractPropDefs('<div>hello</div>')).toEqual([])
  })

  it('returns nothing rather than throwing on a component that will not parse', () => {
    // Collection renders every story file; one unparseable component must not
    // take the run down (#81).
    expect(extractPropDefs('<script>let = = =</script>')).toEqual([])
  })

  it('ignores the module script, whose exports are not props', () => {
    const source = `<script context="module">export let notAProp = 1</script>\n${component('export let real = 2')}`
    expect(extractPropDefs(source).map(p => p.name)).toEqual(['real'])
  })
})

describe('extractPropDefs, props no control can drive', () => {
  it('drops a snippet prop, in either mode', () => {
    // `children` is slot content that arrives as a prop. Handing it to HstJson
    // would replace the component's markup with a JSON editor.
    const legacy = component(`
  import type { Snippet } from 'svelte'
  export let children: Snippet | undefined`)
    const runes = component(`
  import type { Snippet } from 'svelte'
  interface Props { children?: Snippet, label: string }
  let { children, label }: Props = $props()`)

    expect(extractPropDefs(legacy)).toEqual([])
    expect(extractPropDefs(runes).map(p => p.name)).toEqual(['label'])
  })

  it('treats an un-initialised prop annotated with undefined as optional', () => {
    // The real EventButton and NestedButton components both declare props this
    // way, and both read as required without this.
    const source = component('export let onmyevent: ((value: string) => void) | undefined')

    expect(extractPropDefs(source)[0]).toMatchObject({ name: 'onmyevent', required: false })
  })
})
