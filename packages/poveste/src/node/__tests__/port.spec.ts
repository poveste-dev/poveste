import { describe, expect, it } from 'vitest'
import { resolvePort } from '../commands/port.js'

describe('resolvePort', () => {
  it('returns undefined when the flag was not passed', () => {
    expect(resolvePort(undefined, 'preview')).toBeUndefined()
  })

  it('parses the number sade hands over as a string', () => {
    expect(resolvePort('4569', 'preview')).toBe(4569)
  })

  it('passes a number through', () => {
    expect(resolvePort(6006, 'dev')).toBe(6006)
  })

  // sade declares `--port <port>` but does not enforce the value, so a bare
  // `--port` arrives as `true`. `Number(true)` is 1 — a valid port that binds
  // to a privileged one — so this has to be rejected by type.
  it.each([
    ['a valueless flag', true],
    ['a non-numeric value', 'abc'],
    ['an empty value', ''],
    ['a port above the range', '99999'],
    ['a fractional port', '80.5'],
  ])('rejects %s', (_name, value) => {
    expect(() => resolvePort(value, 'preview')).toThrow(/--port needs a number/)
  })

  it('names the command in the message, so the hint is runnable', () => {
    expect(() => resolvePort(true, 'dev')).toThrow(/poveste dev --port 6006/)
  })
})
