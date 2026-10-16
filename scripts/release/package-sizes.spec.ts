import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatDiff, formatPercent, MARKER, publishedPackages, sizeTable } from './package-sizes.ts'

describe('formatDiff', () => {
  it('prints an unchanged package as 0', () => {
    expect(formatDiff(0)).toBe('0')
  })

  // A version string's few bytes printed as "−0.0 kB" when rounded (#988).
  it('prints a change under 1 kB in bytes', () => {
    expect(formatDiff(-3)).toBe('−3 B')
    expect(formatDiff(999)).toBe('+999 B')
  })

  it('prints a change of 1 kB or more in kB', () => {
    expect(formatDiff(1100)).toBe('+1.1 kB')
  })
})

describe('formatPercent', () => {
  it('signs the change to two places', () => {
    expect(formatPercent(8000, 321)).toBe('+4.01%')
    expect(formatPercent(34100, -4)).toBe('−0.01%')
  })

  it('prints no change as 0%', () => {
    expect(formatPercent(2900, 0)).toBe('0%')
  })
})

describe('sizeTable', () => {
  const table = sizeTable(
    { 'poveste': 97400, '@poveste/plugin-react': 8000, '@poveste/gone': 1000 },
    { 'poveste': 97826, '@poveste/plugin-react': 8321, '@poveste/fresh': 2000 },
    'feat/1159-docgen-vue',
  )

  it('labels the base column with the base branch, which for a stacked PR is not next', () => {
    expect(table).toContain('| package | `feat/1159-docgen-vue` | this PR | diff | % |')
  })

  it('has a row per package, sorted by name', () => {
    expect(table).toContain('| `@poveste/plugin-react` | 8.0 kB | 8.3 kB | +321 B | +4.01% |')
    expect(table.indexOf('`@poveste/fresh`')).toBeLessThan(table.indexOf('`poveste`'))
  })

  it('names a package only one side has', () => {
    expect(table).toContain('| `@poveste/fresh` | — | 2.0 kB | new | |')
    expect(table).toContain('| `@poveste/gone` | 1.0 kB | — | removed | |')
  })

  it('totals every package on each side', () => {
    expect(table).toContain('| **total** | **106.4 kB** | **108.1 kB** | **+1.7 kB** | **+1.64%** |')
  })

  it('starts with the marker the workflow finds its own comment by', () => {
    expect(table.startsWith(MARKER)).toBe(true)
  })
})

describe('publishedPackages', () => {
  it('takes every package that is not private, from its manifest', () => {
    const root = mkdtempSync(join(tmpdir(), 'package-sizes-'))
    for (const [dir, manifest] of Object.entries({ core: { name: 'poveste' }, docs: { name: 'docs', private: true } })) {
      mkdirSync(join(root, 'packages', dir), { recursive: true })
      writeFileSync(join(root, 'packages', dir, 'package.json'), JSON.stringify(manifest))
    }

    expect(publishedPackages(root).map(p => p.name)).toEqual(['poveste'])
  })
})
