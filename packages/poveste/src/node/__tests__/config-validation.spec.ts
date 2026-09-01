import { describe, expect, it } from 'vitest'
import { configProblems, describeKind } from '../config-validation.js'

// #324: `outDir: 42` reached `pathe` and became
// `TypeError: input.replace is not a function`, naming neither Poveste, nor the
// option, nor the config file.
describe('configProblems', () => {
  it('names the file, the key, the expected type and what was received', () => {
    expect(configProblems({ outDir: 42 }, 'poveste.config.ts')).toEqual([
      'poveste.config.ts: `outDir` must be string, received number (42)',
    ])
  })

  it('is silent on a valid config', () => {
    expect(configProblems({ outDir: '.poveste/dist', storyMatch: ['**/*.story.vue'] }, 'c.ts')).toEqual([])
  })

  // An absent option falls back to its default, which is always valid.
  it('says nothing about an option that is not set', () => {
    expect(configProblems({}, 'c.ts')).toEqual([])
  })

  it('treats an explicit undefined as absent, since defu does', () => {
    expect(configProblems({ outDir: undefined }, 'c.ts')).toEqual([])
  })

  it('reads nested options', () => {
    expect(configProblems({ theme: { title: false } }, 'c.ts')).toEqual([
      'c.ts: `theme.title` must be string, received boolean (false)',
    ])
  })

  it('does not trip over a nested path whose parent is missing', () => {
    expect(configProblems({ theme: {} }, 'c.ts')).toEqual([])
  })

  it('accepts either type where an option takes two', () => {
    expect(configProblems({ setupFile: './setup.ts' }, 'c.ts')).toEqual([])
    expect(configProblems({ setupFile: { browser: './b.ts' } }, 'c.ts')).toEqual([])
    expect(configProblems({ setupFile: 7 }, 'c.ts')).toEqual([
      'c.ts: `setupFile` must be string or object, received number (7)',
    ])
  })

  // A string[] option given a mixed array is the failure that would otherwise
  // surface deep inside a glob library.
  it('rejects an array whose items are the wrong type', () => {
    expect(configProblems({ storyMatch: ['ok', 3] }, 'c.ts')).toEqual([
      'c.ts: `storyMatch` must be string[], received array ([\"ok\",3])',
    ])
  })

  it('reports every problem rather than only the first', () => {
    expect(configProblems({ outDir: 1, isolateStyles: 'yes' }, 'c.ts')).toHaveLength(2)
  })

  it('truncates a long value rather than printing the whole thing back', () => {
    const [problem] = configProblems({ outDir: { nested: 'x'.repeat(200) } }, 'c.ts')

    expect(problem.length).toBeLessThan(120)
    expect(problem).toContain('…')
  })
})

describe('describeKind', () => {
  it('distinguishes a string array from a mixed one', () => {
    expect(describeKind(['a', 'b'])).toBe('string[]')
    expect(describeKind(['a', 1])).toBe('array')
  })
})

// The path `examples/svelte5` and `examples/sveltekit` actually use: no
// `poveste.config.ts`, everything under the `poveste` key of the vite config.
// Validating only the first file left half the reference books unchecked.
describe('the vite config path', () => {
  it('is validated with the same rules', () => {
    expect(configProblems({ outDir: 42 }, 'vite.config.ts')).toEqual([
      'vite.config.ts: `outDir` must be string, received number (42)',
    ])
  })
})
