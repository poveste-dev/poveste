import { describe, expect, it } from 'vitest'
import { extractPropDefs } from './props'

function component(script: string): string {
  return `<script lang="ts">\n${script}\n</script>\n<div />`
}

const propsOf = (script: string) => extractPropDefs(component(script))
const firstProp = (script: string) => propsOf(script)?.[0]
const propNames = (script: string) => propsOf(script)?.map(p => p.name)

describe('extractPropDefs, legacy mode', () => {
  it('reads name, type and default from an export let', () => {
    expect(propsOf(`export let size: string = 'medium'`))
      .toEqual([{ name: 'size', types: ['string'], required: false, default: 'medium' }])
  })

  it('marks a prop with no initialiser required', () => {
    expect(firstProp('export let label: string'))
      .toEqual({ name: 'label', types: ['string'], required: true, default: undefined })
  })

  it('reads every declarator on one line, with its own default', () => {
    expect(propsOf('export let a = 1, b = 2')).toEqual([
      { name: 'a', types: ['number'], required: false, default: 1 },
      { name: 'b', types: ['number'], required: false, default: 2 },
    ])
  })

  it('reads the renaming export form, which is also a prop', () => {
    // `export { internal as external }` compiles to the same `$.prop` call as
    // `export let external`, so the panel has to offer it.
    expect(propsOf('let internal = 1\n  export { internal as external }'))
      .toEqual([{ name: 'external', required: false }])
  })

  it('ignores export const and export function, which are not props', () => {
    expect(propsOf('export const version = 1\nexport function focus() {}')).toEqual([])
  })

  it('ignores a plain local let', () => {
    expect(propsOf('let internal = 1')).toEqual([])
  })
})

describe('extractPropDefs, runes mode', () => {
  it('resolves types and optionality through a Props interface', () => {
    expect(propsOf(`
  interface Props {
    label?: string
    count: number
  }
  let { label = 'Click me', count }: Props = $props()`)).toEqual([
      { name: 'label', types: ['string'], required: false, default: 'Click me' },
      { name: 'count', types: ['number'], required: true, default: undefined },
    ])
  })

  it('resolves a type alias and an inline type literal', () => {
    expect(firstProp(`type Props = { open: boolean }\n  let { open }: Props = $props()`))
      .toEqual({ name: 'open', types: ['boolean'], required: true, default: undefined })
    expect(firstProp(`let { open }: { open?: boolean } = $props()`))
      .toEqual({ name: 'open', types: ['boolean'], required: false, default: undefined })
  })

  it('reads a Props interface declared in the module script', () => {
    const source = `<script lang="ts" module>\n  interface Props { a?: string }\n</script>\n${component(`let { a }: Props = $props()`)}`
    expect(extractPropDefs(source))
      .toEqual([{ name: 'a', types: ['string'], required: false, default: undefined }])
  })

  it('reads the non-destructured form', () => {
    // `let props: Props = $props()`, then `props.a` in markup. Documented, and
    // the annotation is the only source of prop names for it.
    expect(propsOf(`
  interface Props { a?: string, b: number }
  let props: Props = $props()`)).toEqual([
      { name: 'a', types: ['string'], required: false, default: undefined },
      { name: 'b', types: ['number'], required: true, default: undefined },
    ])
  })

  it('keeps a prop the component never destructures', () => {
    expect(propsOf(`
  interface Props { shown: string, forwarded?: number }
  let { shown }: Props = $props()`)).toEqual([
      { name: 'shown', types: ['string'], required: true, default: undefined },
      { name: 'forwarded', types: ['number'], required: false, default: undefined },
    ])
  })

  it('keeps a destructured prop an extends clause hides', () => {
    // The interface names only its own members, so an inherited prop is
    // reachable solely through the destructuring. Choosing either source alone
    // loses props.
    expect(propsOf(`
  interface Props extends HTMLButtonAttributes { label: string }
  let { label, disabled = false }: Props = $props()`)).toEqual([
      { name: 'label', types: ['string'], required: true, default: undefined },
      { name: 'disabled', types: ['boolean'], required: false, default: false },
    ])
  })

  it('keeps every prop when the interface adds nothing of its own', () => {
    expect(propsOf(`
  interface Props extends HTMLButtonAttributes {}
  let { disabled = false }: Props = $props()`))
      .toEqual([{ name: 'disabled', types: ['boolean'], required: false, default: false }])
  })

  it('falls back to the destructuring when there is no annotation', () => {
    expect(propsOf(`let { label = 'hi', count } = $props()`)).toEqual([
      { name: 'label', types: ['string'], required: false, default: 'hi' },
      { name: 'count', types: undefined, required: false, default: undefined },
    ])
  })

  it('treats a default as satisfying a required prop', () => {
    expect(firstProp(`
  interface Props { count: number }
  let { count = 0 }: Props = $props()`))
      .toEqual({ name: 'count', types: ['number'], required: false, default: 0 })
  })

  it('ignores a computed key, which names a local variable and not a prop', () => {
    expect(propsOf('const k = "a"\n  let { [k]: v } = $props()')).toEqual([])
  })
})

describe('extractPropDefs, type mapping', () => {
  const typesOf = (annotation: string) => firstProp(`export let value: ${annotation}`)?.types

  it('maps the primitives the controls panel switches on', () => {
    expect(typesOf('string')).toEqual(['string'])
    expect(typesOf('number')).toEqual(['number'])
    expect(typesOf('boolean')).toEqual(['boolean'])
  })

  it('maps arrays, in every spelling', () => {
    expect(typesOf('string[]')).toEqual(['array'])
    expect(typesOf('Array<string>')).toEqual(['array'])
    expect(typesOf('ReadonlyArray<string>')).toEqual(['array'])
    expect(typesOf('readonly string[]')).toEqual(['array'])
    expect(typesOf('[string, number]')).toEqual(['array'])
  })

  it('does not mistake a type that merely starts with Array', () => {
    expect(typesOf('ArrayLike<string>')).toEqual(['unknown'])
  })

  it('collapses a literal union to its underlying type', () => {
    expect(typesOf(`'small' | 'medium' | 'large'`)).toEqual(['string'])
    expect(typesOf('1 | 2 | 3')).toEqual(['number'])
  })

  it('reads a negative literal type as a number', () => {
    // The literal is a UnaryExpression wrapping the number, so a naive read
    // gives `unknown` and the panel offers a JSON editor for `-1 | 0 | 1`.
    expect(typesOf('-1 | 0 | 1')).toEqual(['number'])
  })

  it('drops the nullish members an optional prop carries', () => {
    expect(typesOf('string | undefined')).toEqual(['string'])
    expect(typesOf('string | null')).toEqual(['string'])
  })

  it('sorts a concrete type ahead of unknown, whichever way it was written', () => {
    // The panel reads `types[0]`, so insertion order would otherwise decide
    // which control the same prop gets.
    expect(typesOf('string | SomeType')).toEqual(['string', 'unknown'])
    expect(typesOf('SomeType | string')).toEqual(['string', 'unknown'])
  })

  it('keeps both sides of a genuinely mixed union', () => {
    expect(typesOf('string | number')).toEqual(['string', 'number'])
  })

  it('maps an object literal, and anything it cannot read, to something HstJson can show', () => {
    expect(typesOf('{ a: string }')).toEqual(['object'])
    expect(typesOf('SomeImportedType')).toEqual(['unknown'])
  })

  it('infers a type from the default when there is no annotation', () => {
    // A plain-JS component would otherwise get a JSON editor for a colour
    // string, and the user would have to type the quotes themselves.
    expect(firstProp(`export let colorselect = '#d5bebe'`))
      .toEqual({ name: 'colorselect', types: ['string'], required: false, default: '#d5bebe' })
  })
})

describe('extractPropDefs, props no control can drive', () => {
  it('drops a snippet however the type is referenced', () => {
    expect(propNames(`export let children: Snippet | undefined`)).toEqual([])
    expect(propNames(`export let children: Snippet<[{ x: number }]> | undefined`)).toEqual([])
    // A namespace import gives a qualified name, which has no `.name` of its own.
    expect(propNames(`export let children: svelte.Snippet | undefined`)).toEqual([])
  })

  it('drops a snippet named in an interface, keeping the rest', () => {
    expect(propNames(`interface Props { children?: Snippet, label: string }\n  let { children, label }: Props = $props()`))
      .toEqual(['label'])
  })

  it('drops `children` in the unannotated form, where only the name identifies it', () => {
    expect(propNames('let { title, children } = $props()')).toEqual(['title'])
  })

  it('drops a function prop, which a JSON control would replace with an object', () => {
    // The component calls it — `onmyevent?.({ a, b })` — so writing an object
    // into that control turns the next interaction into a TypeError.
    expect(propNames('export let onmyevent: ((value: string) => void) | undefined')).toEqual([])
    expect(propNames(`interface Props { onclick?: () => void, label: string }\n  let { onclick, label }: Props = $props()`))
      .toEqual(['label'])
  })

  it('treats an un-initialised prop annotated with undefined or null as optional', () => {
    expect(firstProp('export let a: string | undefined')).toMatchObject({ name: 'a', required: false })
    expect(firstProp('export let b: string | null')).toMatchObject({ name: 'b', required: false })
  })
})

describe('extractPropDefs, defaults', () => {
  const defaultOf = (init: string) => firstProp(`export let value = ${init}`)

  it('keeps literal values as values, not source text', () => {
    expect(defaultOf('1')).toMatchObject({ name: 'value', default: 1 })
    expect(defaultOf('true')).toMatchObject({ name: 'value', default: true })
    expect(defaultOf(`'hi'`)).toMatchObject({ name: 'value', default: 'hi' })
    expect(defaultOf('-1')).toMatchObject({ name: 'value', default: -1 })
  })

  it('unwraps a $bindable default', () => {
    // The canonical way to default a bindable prop; the value is one node deeper.
    expect(firstProp(`interface Props { value?: string }\n  let { value = $bindable('x') }: Props = $props()`))
      .toEqual({ name: 'value', types: ['string'], required: false, default: 'x' })
  })

  it('drops a default no control could hold, and keeps the prop', () => {
    // Asserting the prop survives, not merely that `default` is undefined — an
    // empty result would satisfy that on its own.
    expect(defaultOf('{}')).toEqual({ name: 'value', types: undefined, required: false, default: undefined })
    expect(defaultOf('() => {}')).toMatchObject({ name: 'value', default: undefined })
    expect(defaultOf('makeIt()')).toMatchObject({ name: 'value', default: undefined })
    expect(defaultOf('1n')).toMatchObject({ name: 'value', default: undefined })
    expect(defaultOf('/re/')).toMatchObject({ name: 'value', default: undefined })
  })
})

describe('extractPropDefs, source it has to survive', () => {
  it('reads a component whose styles need a preprocessor', () => {
    // `svelte/compiler` parses raw source, so SCSS is a parse error even though
    // the component compiles. The props are in the script either way.
    const scss = `<script lang="ts">\n  export let msg: string = 'hi'\n</script>\n<h1>{msg}</h1>\n<style lang="scss">\n// a comment\n$c: red;\nh1 { color: $c }\n</style>`

    expect(extractPropDefs(scss))
      .toEqual([{ name: 'msg', types: ['string'], required: false, default: 'hi' }])
  })

  it('reads a story file, whose type import shadows its own prop', () => {
    // `import type { Hst }` beside `export let Hst: Hst` reads as a duplicate
    // declaration to the raw parser, and 102 of this repo's own components are
    // that shape.
    const story = `<script lang="ts">\n  import type { Hst } from '@poveste/plugin-svelte'\n\n  export let Hst: Hst\n</script>\n<div />`

    // And `Hst` itself is not a prop — poveste injects it, every story file
    // declares it, and no user sets it.
    expect(extractPropDefs(story)).toEqual([])
  })

  it('returns an empty list for a component with no props', () => {
    expect(extractPropDefs('<div>hello</div>')).toEqual([])
  })

  it('returns undefined, not an empty list, when the source cannot be read', () => {
    // A caller deciding whether to show a controls panel has to tell "no props"
    // apart from "could not tell".
    expect(extractPropDefs('<script>let = = =</script>')).toBeUndefined()
  })

  it('ignores exports in the module script, which are not props', () => {
    const source = `<script context="module">export let notAProp = 1</script>\n${component('export let real = 2')}`
    expect(extractPropDefs(source)).toEqual([{ name: 'real', types: ['number'], required: false, default: 2 }])
  })
})
