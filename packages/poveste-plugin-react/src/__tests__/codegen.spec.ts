// @vitest-environment jsdom
import type { Variant } from '@poveste/shared'
import type { ReactNode, Ref } from 'react'
import type { ReactRenderApi } from '../types'
import { reactive } from '@poveste/vendors/vue'
import { createContext, createElement, forwardRef, Fragment, lazy, memo, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { generateSourceCode } from '../client/codegen'

type Render = (api: ReactRenderApi<any>) => ReactNode

function variantOf(render: Render, state: Record<string, any> = {}): Variant {
  return reactive({ id: 'v', title: 'v', state, slots: () => ({ default: render }) }) as Variant
}

function Badge(props: { tone: string, children?: ReactNode }) {
  return createElement('span', null, props.children)
}
function Counter(props: { count: number, label: string, onIncrement: () => void }) {
  return createElement('button', { onClick: props.onIncrement }, `${props.label} ${props.count}`)
}

describe('a React variant\'s Dynamic source', () => {
  it('prints the element its render returns as JSX', () => {
    const source = generateSourceCode(variantOf(() => createElement(Badge, { tone: 'info' }, 'Information')))

    expect(source).toBe('<Badge tone="info">Information</Badge>')
  })

  it('prints the values state gives the props now, and a handler as an ellipsis', () => {
    const variant = variantOf(({ state }) => createElement(Counter, { count: state.count, label: state.label, onIncrement: () => {} }), { count: 3, label: 'Clicked' })

    expect(generateSourceCode(variant)).toBe('<Counter count={3} label="Clicked" onIncrement={…} />')
  })

  it('follows a change to the variant\'s state', () => {
    const variant = variantOf(({ state }) => createElement(Badge, { tone: state.tone }), { tone: 'info' })

    variant.state.tone = 'warn'

    expect(generateSourceCode(variant)).toBe('<Badge tone="warn" />')
  })

  it('calls a render that uses a hook as a component body, without a word in the console', () => {
    const error = vi.spyOn(console, 'error')
    const variant = variantOf(({ state }) => {
      const [on] = useState(false)
      return createElement('button', { 'type': 'button', 'aria-pressed': on, 'onClick': () => {} }, `${state.label}: ${on ? 'On' : 'Off'}`)
    }, { label: 'Power' })

    const source = generateSourceCode(variant)

    expect(source).toBe('<button type="button" aria-pressed={false} onClick={…}>Power: Off</button>')
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('opens fragments, nests children and names memo and forwardRef components', () => {
    function Card(props: { children?: ReactNode }) {
      return createElement('div', null, props.children)
    }
    function Field(props: { label: string }, ref: Ref<HTMLInputElement>) {
      return createElement('input', { ref, 'aria-label': props.label })
    }
    const MemoCard = memo(Card)
    const RefField = forwardRef(Field)
    const variant = variantOf(() => createElement(Fragment, null, createElement(MemoCard, null, createElement(RefField, { label: 'Name' }), 'Hello'), null, false))

    expect(generateSourceCode(variant)).toBe([
      '<Card>',
      '  <Field label="Name" />',
      '  Hello',
      '</Card>',
    ].join('\n'))
  })

  it('wraps a root with siblings in a fragment', () => {
    const variant = variantOf(() => [createElement(Badge, { key: 'a', tone: 'info' }), createElement(Badge, { key: 'b', tone: 'warn' })])

    expect(generateSourceCode(variant)).toBe('<>\n  <Badge tone="info" />\n  <Badge tone="warn" />\n</>')
  })

  it('prints objects, arrays and elements passed as props', () => {
    const variant = variantOf(() => createElement(Badge, { tone: 'info', style: { 'color': 'red', 'font-size': 2 }, items: [1, 'two'], icon: createElement('svg', { width: 12 }) } as any))

    expect(generateSourceCode(variant)).toBe('<Badge\n  tone="info"\n  style={{ color: "red", "font-size": 2 }}\n  items={[1, "two"]}\n  icon={<svg width={12} />}\n/>')
  })

  it('keeps text a JSX child cannot hold as written in an expression', () => {
    const variant = variantOf(() => createElement('code', null, 'a {b} <c>'))

    expect(generateSourceCode(variant)).toBe('<code>{"a {b} <c>"}</code>')
  })

  it('keeps the spaces between text and elements', () => {
    const variant = variantOf(() => createElement('p', null, 'text ', createElement('b', null, 'bold'), ' ', 2))

    expect(generateSourceCode(variant)).toBe([
      '<p>',
      '  {"text "}',
      '  <b>bold</b>',
      '  {" 2"}',
      '</p>',
    ].join('\n'))
  })

  it('keeps a space alone between two elements', () => {
    const variant = variantOf(() => createElement('p', null, createElement('b', null, 'a'), ' ', createElement('i', null, 'b')))

    expect(generateSourceCode(variant)).toBe('<p>\n  <b>a</b>\n  {" "}\n  <i>b</i>\n</p>')
  })

  it('keeps the spaces at the edges of text in a root with siblings', () => {
    const variant = variantOf(() => ['Total: ', createElement('b', { key: 'b' }, 'bold')])

    expect(generateSourceCode(variant)).toBe('<>\n  {"Total: "}\n  <b>bold</b>\n</>')
  })

  it('keeps a line break in text that goes on lines of its own', () => {
    const variant = variantOf(() => createElement('pre', null, 'one\ntwo'))

    expect(generateSourceCode(variant)).toBe('<pre>\n  {"one\\ntwo"}\n</pre>')
  })

  it('leaves spaces in text on the same line as its tags, where JSX keeps them', () => {
    expect(generateSourceCode(variantOf(() => createElement('b', null, ' spaced ')))).toBe('<b> spaced </b>')
  })

  it('prints a `Date` prop as code that makes that date', () => {
    const variant = variantOf(() => createElement(Badge, { tone: 'info', ...{ at: new Date('2026-11-02T10:00:00.000Z') } }))

    expect(generateSourceCode(variant)).toBe('<Badge tone="info" at={new Date("2026-11-02T10:00:00.000Z")} />')
  })

  it('prints a `Date` from state and one inside an object', () => {
    const variant = variantOf(({ state }) => createElement(Badge, { tone: 'info', ...{ range: { from: state.from } } }), { from: new Date('2026-01-01T00:00:00.000Z') })

    expect(generateSourceCode(variant)).toBe('<Badge tone="info" range={{ from: new Date("2026-01-01T00:00:00.000Z") }} />')
  })

  it('prints an invalid `Date` as code that makes one', () => {
    const variant = variantOf(() => createElement(Badge, { tone: 'info', ...{ at: new Date('nope') } }))

    expect(generateSourceCode(variant)).toBe('<Badge tone="info" at={new Date(NaN)} />')
  })

  describe('a component with no name to print', () => {
    const child = () => createElement('b')

    it.each([
      ['`memo` of an arrow function', () => memo(() => child())],
      ['`forwardRef` of an arrow function', () => forwardRef(() => child())],
      ['`lazy`', () => lazy(async () => ({ default: child }))],
      ['a context with no `displayName`', () => createContext('light')],
      ['a function with the name React Refresh gave it', () => {
        function _c4() {
          return child()
        }
        return _c4
      }],
    ])('gives nothing for %s, so the panel shows the story file', (_, type) => {
      const component = type() as never

      expect(generateSourceCode(variantOf(() => createElement(component)))).toBeUndefined()
    })

    it('gives nothing when it is further down the tree', () => {
      const Anonymous = memo(() => child())

      expect(generateSourceCode(variantOf(() => createElement('div', null, createElement(Anonymous))))).toBeUndefined()
    })

    it('gives nothing when it is passed as a prop', () => {
      const Anonymous = memo(() => child())

      expect(generateSourceCode(variantOf(() => createElement(Badge, { tone: 'info', ...{ icon: createElement(Anonymous) } })))).toBeUndefined()
    })
  })

  it('prints a context\'s `displayName`, which renders as a provider in React 19', () => {
    const Theme = createContext('light')
    Theme.displayName = 'Theme'

    expect(generateSourceCode(variantOf(() => createElement(Theme.Provider, { value: 'dark' })))).toBe('<Theme value="dark" />')
  })

  it('gives nothing for a render that throws, so the panel shows the story file', () => {
    const variant = variantOf(() => {
      throw new Error('broken')
    })

    expect(generateSourceCode(variant)).toBeUndefined()
  })
})
