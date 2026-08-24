import { describe, expect, it } from 'vitest'
import { hmrPortFor, resolvePort } from '../commands/port.js'

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

// `@nuxt/vite-builder` otherwise pins every server's HMR socket to the constant
// 24678, so two dev servers on different `--port`s collide and the second
// silently loses HMR (#221). The socket has to be as unique as the book port.
describe('hmrPortFor', () => {
  it('derives a port distinct from the dev port', () => {
    expect(hmrPortFor(6006)).not.toBe(6006)
  })

  it('gives distinct dev ports distinct sockets', () => {
    expect(hmrPortFor(4567)).not.toBe(hmrPortFor(4568))
  })

  it('never lands on the framework default that collides', () => {
    for (const p of [4567, 4568, 6006, 8080]) {
      expect(hmrPortFor(p)).not.toBe(24678)
    }
  })

  it('stays within the valid port range, even for a high dev port', () => {
    for (const p of [1024, 6006, 45535, 45536, 65535]) {
      const hmr = hmrPortFor(p)
      expect(hmr).toBeGreaterThanOrEqual(0)
      expect(hmr).toBeLessThanOrEqual(65535)
      expect(hmr).not.toBe(p)
    }
  })

  it('falls back to the default dev port when none was given', () => {
    expect(hmrPortFor(undefined)).toBe(hmrPortFor(6006))
  })
})
