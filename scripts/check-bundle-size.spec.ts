import { describe, expect, it } from 'vitest'
import { barrelImport, LIMITS, overLimit } from './check-bundle-size.ts'

const LIMIT = [{ prefix: 'highlighter', max: 3000, because: 'a barrel import' }]

describe('overLimit', () => {
  it('is silent for a chunk under its ceiling', () => {
    expect(overLimit([{ name: 'highlighter-abc.js', kb: 1346 }], LIMIT)).toEqual([])
  })

  // The regression this exists for: 9960 KB of grammars nobody asked for.
  it('names a chunk over its ceiling and why', () => {
    const problems = overLimit([{ name: 'highlighter-abc.js', kb: 9960 }], LIMIT)

    expect(problems[0]).toMatch(/highlighter-abc\.js is 9960 KB, over its 3000 KB ceiling — a barrel import/)
  })

  // A chunk that stops matching stops being checked, silently — which is the
  // same shape of failure as the one being guarded against.
  it('reports a prefix that matches nothing rather than passing', () => {
    expect(overLimit([{ name: 'vendor-abc.js', kb: 10 }], LIMIT)[0]).toMatch(/checked nothing/)
  })

  it('sums every file for the whole-build ceiling', () => {
    const total = [{ prefix: '', max: 100, because: 'the whole book' }]

    expect(overLimit([{ name: 'a.js', kb: 60 }, { name: 'b.js', kb: 60 }], total)[0]).toMatch(/is 120 KB/)
  })

  it('does not require a named chunk for the whole-build ceiling', () => {
    const total = [{ prefix: '', max: 1000, because: 'the whole book' }]

    expect(overLimit([{ name: 'a.js', kb: 10 }], total)).toEqual([])
  })

  it('reports every ceiling that was blown, so one run says the whole story', () => {
    const both = [...LIMIT, { prefix: '', max: 100, because: 'the whole book' }]

    expect(overLimit([{ name: 'highlighter-abc.js', kb: 9960 }], both)).toHaveLength(2)
  })
})

describe('the ceilings themselves', () => {
  // A ceiling with no reason next to it gets raised without being read.
  it('gives every ceiling a reason', () => {
    expect(LIMITS.every(limit => limit.because.length > 0)).toBe(true)
  })

  it('keeps the highlighter ceiling below what the barrel import shipped', () => {
    expect(LIMITS.find(limit => limit.prefix === 'highlighter')!.max).toBeLessThan(9960)
  })
})

describe('barrelImport', () => {
  it('is silent on the fine-grained entry', () => {
    expect(barrelImport('import { createHighlighterCore } from \'shiki/core\'')).toBeUndefined()
  })

  // The regression itself, caught at its source rather than by its weight.
  it('names the barrel import', () => {
    expect(barrelImport('import { createHighlighter } from \'shiki\'')).toBe('import { createHighlighter } from \'shiki\'')
  })

  it('sees a type-only import of the barrel, which pulls it just the same', () => {
    expect(barrelImport('import type { Highlighter } from \'shiki\'')).toBeDefined()
  })

  it('does not fire on a subpath that merely starts with the name', () => {
    expect(barrelImport('import { x } from \'shikiji\'')).toBeUndefined()
  })
})
