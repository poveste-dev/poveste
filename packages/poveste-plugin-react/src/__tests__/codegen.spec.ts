// @vitest-environment jsdom
import type { Variant } from '@poveste/shared'
import type { ReactNode, Ref } from 'react'
import type { ReactRenderApi } from '../types'
import { reactive } from '@poveste/vendors/vue'
import { createElement, forwardRef, Fragment, memo, useState } from 'react'
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

  it('gives nothing for a render that throws, so the panel shows the story file', () => {
    const variant = variantOf(() => {
      throw new Error('broken')
    })

    expect(generateSourceCode(variant)).toBeUndefined()
  })
})
