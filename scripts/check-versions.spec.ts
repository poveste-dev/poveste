import { describe, expect, it } from 'vitest'
import { parseTable, readmeRangeProblems, tableProblems } from './check-versions.ts'

// The defect this guard exists for is #148: the README advertised `svelte ^5.0.0`
// while the plugin declared `^5.46.4`, inviting a combination that cannot be
// assembled at all.

const EXPECTED = [
  { label: 'Svelte', expected: '^5.46.4', source: 'packages/poveste-plugin-svelte/package.json → peerDependencies["svelte"]' },
]

describe('parseTable', () => {
  it('reads a label out of its markdown link and a range out of its backticks', () => {
    const table = parseTable('README.md', '| [Svelte](https://svelte.dev) | `^5.46.4` | proven by a job |')

    expect(table.rows.get('Svelte')).toBe('^5.46.4')
  })

  it('drops the asterisk a footnoted row carries', () => {
    const table = parseTable('README.md', '| [Svelte](https://svelte.dev)* | `^5.46.4` | … |')

    expect(table.rows.get('Svelte')).toBe('^5.46.4')
  })

  // A range like `^22 \| ^24` splits the row if the escape is not honoured.
  it('keeps an escaped pipe inside a range instead of splitting the cell on it', () => {
    const table = parseTable('README.md', '| [Node](https://nodejs.org) | `^22.22.2 \\| ^24.15.0` | … |')

    expect(table.rows.get('Node')).toBe('^22.22.2 | ^24.15.0')
  })

  it('ignores prose between tables', () => {
    const table = parseTable('README.md', 'Some prose.\n\n| Vite | `^8.0.0` |')

    expect([...table.rows.keys()]).toEqual(['Vite'])
  })

  // Both files carry a header row, and `| --- |` would otherwise become a row.
  it('keeps the first value for a label rather than letting a later table win', () => {
    const table = parseTable('README.md', '| Vite | `^8.0.0` |\n| Vite | `^7.0.0` |')

    expect(table.rows.get('Vite')).toBe('^8.0.0')
  })
})

describe('tableProblems', () => {
  it('is silent when the documented range matches what is declared', () => {
    const table = parseTable('README.md', '| Svelte | `^5.46.4` |')

    expect(tableProblems(table, EXPECTED)).toEqual([])
  })

  it('names both ranges when the table has drifted', () => {
    const table = parseTable('README.md', '| Svelte | `^5.0.0` |')

    expect(tableProblems(table, EXPECTED)).toEqual([
      expect.stringContaining('README.md says Svelte ^5.0.0, but'),
    ])
  })

  it('reports a row that is missing entirely rather than passing over it', () => {
    const table = parseTable('README.md', '| Vite | `^8.0.0` |')

    expect(tableProblems(table, EXPECTED)).toEqual([
      expect.stringContaining('has no "Svelte" row'),
    ])
  })
})

describe('readmeRangeProblems', () => {
  it('catches a package README advertising a range its own peers contradict', () => {
    const problems = readmeRangeProblems('poveste-plugin-svelte', 'Requires `svelte@^5.0.0`.', { svelte: '^5.46.4' })

    expect(problems).toEqual([
      'packages/poveste-plugin-svelte/README.md says svelte@^5.0.0, but its own peerDependencies say ^5.46.4',
    ])
  })

  it('is silent when they agree', () => {
    expect(readmeRangeProblems('p', 'Requires `svelte@^5.46.4`.', { svelte: '^5.46.4' })).toEqual([])
  })

  // An install line names a package the plugin does not peer on, and saying
  // nothing about it is the point — otherwise every README mention is a rule.
  it('ignores a package that this one does not peer on at all', () => {
    expect(readmeRangeProblems('p', 'Install `poveste@^0.11.0`.', { svelte: '^5.46.4' })).toEqual([])
  })
})
