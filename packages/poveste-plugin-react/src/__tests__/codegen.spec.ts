// @vitest-environment jsdom
import type { Variant } from '@poveste/shared'
import type { ReactNode, Ref } from 'react'
import type { ReactRenderApi } from '../types'
import { runInNewContext } from 'node:vm'
import { reactive } from '@poveste/vendors/vue'
import { createContext, createElement, forwardRef, Fragment, lazy, memo, Profiler, StrictMode, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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

function Stamp(_props: { at?: Date, range?: { from: Date }, icon?: ReactNode }) {
  return null
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

    expect(generateSourceCode(variant)).toBe('<>\n  <Badge key="a" tone="info" />\n  <Badge key="b" tone="warn" />\n</>')
  })

  it('prints objects, arrays and elements passed as props', () => {
    const variant = variantOf(() => createElement(Badge, { tone: 'info', style: { 'color': 'red', 'font-size': 2 }, items: [1, 'two'], icon: createElement('svg', { width: 12 }) } as any))

    expect(generateSourceCode(variant)).toBe('<Badge\n  tone="info"\n  style={{ color: "red", "font-size": 2 }}\n  items={[1, "two"]}\n  icon={<svg width={12} />}\n/>')
  })

  it('keeps text a JSX child cannot hold as written in an expression', () => {
    const variant = variantOf(() => createElement('code', null, 'a {b} <c>'))

    expect(generateSourceCode(variant)).toBe('<code>{"a {b} <c>"}</code>')
  })

  it('keeps the spaces between text and elements on one line', () => {
    const variant = variantOf(() => createElement('p', null, 'text ', createElement('b', null, 'bold'), ' ', 2))

    expect(generateSourceCode(variant)).toBe('<p>text <b>bold</b> 2</p>')
  })

  it('keeps a space alone between two elements', () => {
    const variant = variantOf(() => createElement('p', null, createElement('b', null, 'a'), ' ', createElement('i', null, 'b')))

    expect(generateSourceCode(variant)).toBe('<p><b>a</b> <i>b</i></p>')
  })

  it('keeps the spaces at the edges of text in a root with siblings', () => {
    const variant = variantOf(() => ['Total: ', createElement('b', { key: 'b' }, 'bold')])

    expect(generateSourceCode(variant)).toBe('<>Total: <b key="b">bold</b></>')
  })

  it('puts text in an expression when children too long for a line keep its spaces', () => {
    const text = `${'long '.repeat(20)}`
    const variant = variantOf(() => createElement('p', null, text, createElement('b', null, 'bold')))

    expect(generateSourceCode(variant)).toBe(`<p>\n  {${JSON.stringify(text)}}\n  <b>bold</b>\n</p>`)
  })

  it('keeps a line break in text', () => {
    const variant = variantOf(() => createElement('pre', null, 'one\ntwo'))

    expect(generateSourceCode(variant)).toBe('<pre>\n  {"one\\ntwo"}\n</pre>')
  })

  it('leaves spaces in text on the same line as its tags, where JSX keeps them', () => {
    expect(generateSourceCode(variantOf(() => createElement('b', null, ' spaced ')))).toBe('<b> spaced </b>')
  })

  it('adds no space inside an element passed as a prop', () => {
    const icon = createElement('p', null, 'text ', createElement('b', null, 'bold'), ' 2')

    expect(generateSourceCode(variantOf(() => createElement(Stamp, { icon })))).toBe('<Stamp icon={<p>text <b>bold</b> 2</p>} />')
  })

  it('adds no space between the children of an element passed as a prop', () => {
    const icon = createElement('p', null, createElement('b', null, 'a'), createElement('i', null, 'b'))

    expect(generateSourceCode(variantOf(() => createElement(Stamp, { icon })))).toBe('<Stamp icon={<p><b>a</b><i>b</i></p>} />')
  })

  it('prints a `Date` prop as code that makes that date', () => {
    const variant = variantOf(() => createElement(Stamp, { at: new Date('2026-11-02T10:00:00.000Z') }))

    expect(generateSourceCode(variant)).toBe('<Stamp at={new Date("2026-11-02T10:00:00.000Z")} />')
  })

  it('prints a `Date` from state and one inside an object', () => {
    const variant = variantOf(({ state }) => createElement(Stamp, { range: { from: state.from } }), { from: new Date('2026-01-01T00:00:00.000Z') })

    expect(generateSourceCode(variant)).toBe('<Stamp range={{ from: new Date("2026-01-01T00:00:00.000Z") }} />')
  })

  it('prints a `Date` from another window', () => {
    const variant = variantOf(() => createElement(Stamp, { at: runInNewContext('new Date(0)') }))

    expect(generateSourceCode(variant)).toBe('<Stamp at={new Date("1970-01-01T00:00:00.000Z")} />')
  })

  it('prints an invalid `Date` as code that makes one', () => {
    const variant = variantOf(() => createElement(Stamp, { at: new Date('nope') }))

    expect(generateSourceCode(variant)).toBe('<Stamp at={new Date(NaN)} />')
  })

  it.each([
    ['Suspense', Suspense],
    ['StrictMode', StrictMode],
    ['Profiler', Profiler],
  ])('prints React\'s `%s` by its name', (name, type) => {
    expect(generateSourceCode(variantOf(() => createElement(type as never)))).toBe(`<${name} />`)
  })

  describe('a component with no name to print', () => {
    const child = () => createElement('b')
    const named = (displayName: string) => Object.assign(() => child(), { displayName })
    const unavailable = { unavailable: expect.stringContaining('no name') }

    it.each([
      ['`memo` of an arrow function', () => memo(() => child())],
      ['`forwardRef` of an arrow function', () => forwardRef(() => child())],
      ['`lazy`', () => lazy(async () => ({ default: child }))],
      ['a context with no `displayName`', () => createContext('light')],
      ['a `displayName` that isn\'t a tag', () => named('Styled(Button)')],
      ['a bound function', () => {
        function Card() {
          return child()
        }
        return Card.bind(null)
      }],
      ['a lower-case name', () => {
        function card() {
          return child()
        }
        return memo(card)
      }],
      ['the name of an anonymous default export', () => named('default')],
      ['a function with the name React Refresh gave it', () => {
        function _c4() {
          return child()
        }
        return _c4
      }],
    ])('says so for %s, and the panel shows the story file', (_, type) => {
      const component = type() as never

      expect(generateSourceCode(variantOf(() => createElement(component)))).toEqual(unavailable)
    })

    it('says so when it is further down the tree', () => {
      const Anonymous = memo(() => child())

      expect(generateSourceCode(variantOf(() => createElement('div', null, createElement(Anonymous))))).toEqual(unavailable)
    })

    it('says so when it is passed as a prop', () => {
      const Anonymous = memo(() => child())

      expect(generateSourceCode(variantOf(() => createElement(Stamp, { icon: createElement(Anonymous) })))).toEqual(unavailable)
    })

    it('logs nothing, since a reader gets the reason in the panel', () => {
      const error = vi.spyOn(console, 'error')
      const Anonymous = memo(() => child())

      generateSourceCode(variantOf(() => createElement(Anonymous)))

      expect(error).not.toHaveBeenCalled()
      error.mockRestore()
    })
  })

  it('prints a dotted `displayName` and a custom element as written', () => {
    const Item = Object.assign(() => createElement('b'), { displayName: 'Menu.Item' })

    expect(generateSourceCode(variantOf(() => createElement(Item)))).toBe('<Menu.Item />')
    expect(generateSourceCode(variantOf(() => createElement('my-element')))).toBe('<my-element />')
  })

  it('prints a context\'s `displayName`, which renders as a provider in React 19', () => {
    const Theme = createContext('light')
    Theme.displayName = 'Theme'

    expect(generateSourceCode(variantOf(() => createElement(Theme.Provider, { value: 'dark' })))).toBe('<Theme value="dark" />')
  })

  it('logs a failure in the printer itself, which nothing else would report', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = {
      get value() {
        throw new Error('printer bug')
      },
    }

    expect(generateSourceCode(variantOf(() => createElement(Stamp, { range: broken as never })))).toBeUndefined()
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'printer bug' }))
    error.mockRestore()
  })

  it('gives nothing for a render that throws, so the panel shows the story file', () => {
    const variant = variantOf(() => {
      throw new Error('broken')
    })

    expect(generateSourceCode(variant)).toBeUndefined()
  })

  it('marks a child it can\'t print rather than dropping it', () => {
    const portal = createPortal(createElement('b'), document.body)

    expect(generateSourceCode(variantOf(() => createElement(Badge, { tone: 'a' }, (() => null) as never)))).toBe('<Badge tone="a">\n  {…}\n</Badge>')
    expect(generateSourceCode(variantOf(() => createElement('div', null, portal)))).toBe('<div>\n  {…}\n</div>')
    expect(generateSourceCode(variantOf(() => createElement(Stamp, { icon: createElement('i', null, (() => null) as never) })))).toBe('<Stamp icon={<i>{…}</i>} />')
  })

  it('gives nothing when all a variant renders is what it can\'t print', () => {
    expect(generateSourceCode(variantOf(() => createPortal(createElement('b'), document.body)))).toBeUndefined()
  })

  it('prints an element\'s key', () => {
    expect(generateSourceCode(variantOf(() => createElement(Badge, { key: 'a', tone: 'info' })))).toBe('<Badge key="a" tone="info" />')
    expect(generateSourceCode(variantOf(() => createElement(Badge, { tone: 'info' })))).toBe('<Badge tone="info" />')
  })

  it('prints a value that appears twice both times, and a cycle as `…`', () => {
    const shared = { id: 1 }
    const cycle: Record<string, unknown> = { id: 2 }
    cycle['self'] = cycle

    expect(generateSourceCode(variantOf(() => createElement(Stamp, { range: { from: shared, to: shared } as never })))).toBe('<Stamp range={{ from: { id: 1 }, to: { id: 1 } }} />')
    expect(generateSourceCode(variantOf(() => createElement(Stamp, { range: [shared, shared] as never })))).toBe('<Stamp range={[{ id: 1 }, { id: 1 }]} />')
    expect(generateSourceCode(variantOf(() => createElement(Stamp, { range: cycle as never })))).toBe('<Stamp range={{ id: 2, self: … }} />')
  })

  it('keeps a string JSX would decode as an entity, and leaves a plain ampersand alone', () => {
    expect(generateSourceCode(variantOf(() => createElement('p', { title: '&copy;' })))).toBe('<p title={"&copy;"} />')
    expect(generateSourceCode(variantOf(() => createElement('p', null, 'a &amp; b')))).toBe('<p>{"a &amp; b"}</p>')
    expect(generateSourceCode(variantOf(() => createElement('p', { title: 'Tom & Jerry' }, 'Tom & Jerry')))).toBe('<p title="Tom & Jerry">Tom & Jerry</p>')
  })

  it('runs a story\'s hooks without running its effects or printing anything', () => {
    const effect = vi.fn()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const source = generateSourceCode(variantOf(() => {
      const [count] = useState(3)
      useEffect(effect)
      useLayoutEffect(effect)
      return createElement(Counter, { count, label: 'n', onIncrement: () => {} })
    }))

    expect(source).toBe('<Counter count={3} label="n" onIncrement={…} />')
    expect(effect).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
