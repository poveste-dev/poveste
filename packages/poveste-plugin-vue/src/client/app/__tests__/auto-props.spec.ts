import { describe, expect, it } from 'vitest'
import { inferredType, passedValue } from '../auto-props.js'

/*
 * A production build erases the runtime types Vue infers from a type-only
 * `defineProps`, so the declaration says nothing and the value has to (#490).
 */
describe('the type a value implies', () => {
  it.each([
    ['a string', 'hello', 'string'],
    ['a number', 42, 'number'],
    ['zero', 0, 'number'],
    ['a boolean', false, 'boolean'],
    ['an array', [1, 2], 'array'],
    ['an object', { a: 1 }, 'object'],
  ])('reads %s', (_, value, expected) => {
    expect(inferredType(value)).toBe(expected)
  })

  // Nothing to go on, and guessing would pick a control the prop cannot hold.
  // A factory default arrives here as the function it is, which is why nothing
  // upstream has to strip it first.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a factory default', () => []],
  ])('declines to guess from %s', (_, value) => {
    expect(inferredType(value)).toBe('unknown')
  })
})

describe('the value a vnode passed', () => {
  it('finds a prop under the name it was declared with', () => {
    expect(passedValue({ props: { label: 'x' } }, 'label')).toBe('x')
  })

  // `vnode.type.props` is keyed as declared, `vnode.props` as authored.
  it('finds a multi-word prop written in kebab case', () => {
    expect(passedValue({ props: { 'my-label': 'x' } }, 'myLabel')).toBe('x')
  })

  it('prefers the declared spelling when both are present', () => {
    expect(passedValue({ props: { 'myLabel': 'camel', 'my-label': 'kebab' } }, 'myLabel')).toBe('camel')
  })

  it('is undefined when the component was given no props at all', () => {
    expect(passedValue({}, 'label')).toBeUndefined()
  })
})
