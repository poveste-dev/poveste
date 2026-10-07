import { describe, expect, it } from 'vitest'
import { escapeRegExp } from '../escape-regexp.js'

describe('escapeRegExp', () => {
  it('matches its input literally, for every character', () => {
    const failures = []
    for (let code = 0; code < 0x2FF; code++) {
      const char = String.fromCharCode(code)
      for (const probe of [char, `a${char}b`, `${char}${char}`]) {
        try {
          if (!new RegExp(`^${escapeRegExp(probe)}$`).test(probe)) {
            failures.push(probe)
          }
        }
        catch {
          failures.push(probe)
        }
      }
    }

    expect(failures).toEqual([])
  })

  it('stops a metacharacter matching something else', () => {
    expect(new RegExp(`^${escapeRegExp('style.css')}$`).test('styleXcss')).toBe(false)
    expect(new RegExp(`^${escapeRegExp('a+b')}$`).test('aab')).toBe(false)
    expect(new RegExp(`^${escapeRegExp('a|b')}$`).test('a')).toBe(false)
  })

  // The one site that can throw rather than merely widen: the pattern is built
  // from the consumer's own project path (#608).
  it('survives a project path a consumer might actually have', () => {
    for (const path of ['/Users/me/c++ projects/app', '/Users/me/foo[bar/app', '/w/app (copy)']) {
      expect(() => new RegExp(escapeRegExp(path)), path).not.toThrow()
      expect(new RegExp(`^${escapeRegExp(path)}`).test(`${path}/node_modules`), path).toBe(true)
    }
  })
})
