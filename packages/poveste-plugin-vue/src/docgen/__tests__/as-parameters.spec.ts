import { describe, expect, it } from 'vitest'
import { asParameters } from '../meta.js'

// vue-component-meta prints a payload as its tuple; the table shows what a handler takes (#1436).
describe('an event payload', () => {
  it('reads as a parameter list', () => {
    expect(asParameters('[event: KeyboardEvent]')).toBe('(event: KeyboardEvent)')
    expect(asParameters('[value: string, index: number]')).toBe('(value: string, index: number)')
  })

  it('reads as an empty list when the event carries nothing', () => {
    expect(asParameters('[]')).toBe('()')
  })

  it('keeps a nested tuple, a generic and an arrow inside the list', () => {
    expect(asParameters('[pair: [x: number, y: number]]')).toBe('(pair: [x: number, y: number])')
    expect(asParameters('[value: Map<string, number[]>]')).toBe('(value: Map<string, number[]>)')
    expect(asParameters('[done: () => void]')).toBe('(done: () => void)')
  })

  it('is left as it is when it is not one tuple', () => {
    expect(asParameters('[a: string] | [b: number]')).toBe('[a: string] | [b: number]')
    expect(asParameters('any[]')).toBe('any[]')
    expect(asParameters('unknown')).toBe('unknown')
  })
})
