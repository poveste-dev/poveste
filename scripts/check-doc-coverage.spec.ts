import { describe, expect, it } from 'vitest'
import { entrypointsOf, formatRows, summarise, typesConditionOf, UNRESOLVED } from './check-doc-coverage.ts'
import { removeTrees, tree } from './fixture-tree.ts'
import { runCheck } from './run-check.ts'

const everythingExists = (): boolean => true

function coverage(specifier: string, documented: number, total: number) {
  return { specifier, documented, total, undocumented: [] }
}

describe('entrypointsOf', () => {
  it('names the root entrypoint after the package', () => {
    const manifest = { exports: { '.': { types: './dist/index.d.ts' } } }

    const entries = entrypointsOf('poveste', '/pkg', manifest, everythingExists)

    expect(entries).toEqual([{ specifier: 'poveste', types: '/pkg/dist/index.d.ts', resolved: true }])
  })

  it('names a subpath the way a consumer imports it', () => {
    const manifest = { exports: { './client': { types: './client.d.ts' } } }

    const entries = entrypointsOf('poveste', '/pkg', manifest, everythingExists)

    expect(entries[0].specifier).toBe('poveste/client')
  })

  it('skips a wildcard subpath rather than expanding it', () => {
    const manifest = { exports: { '.': { types: './dist/index.d.ts' }, './*': './*' } }

    const entries = entrypointsOf('poveste', '/pkg', manifest, everythingExists)

    expect(entries).toHaveLength(1)
  })

  it('falls back to the types field when the exports map has no root condition', () => {
    const manifest = { exports: { './client': { types: './client.d.ts' } }, types: './dist/index.d.ts' }

    const entries = entrypointsOf('poveste', '/pkg', manifest, everythingExists)

    expect(entries.map(entry => entry.specifier)).toEqual(['poveste/client', 'poveste'])
  })

  it('does not add the types fallback when exports already declares the root', () => {
    const manifest = { exports: { '.': { types: './dist/index.d.ts' } }, types: './other.d.ts' }

    const entries = entrypointsOf('poveste', '/pkg', manifest, everythingExists)

    expect(entries).toEqual([{ specifier: 'poveste', types: '/pkg/dist/index.d.ts', resolved: true }])
  })

  it('keeps the declared root rather than falling back when its file is missing', () => {
    // The fallback used to key on "no root resolved", which swapped poveste's
    // real entry for a re-export shim and let an unbuilt tree measure clean.
    const manifest = { exports: { '.': { types: './dist/node/index.d.ts' } }, types: './index.d.ts' }

    const entries = entrypointsOf('poveste', '/pkg', manifest, () => false)

    expect(entries).toEqual([{ specifier: 'poveste', types: '/pkg/dist/node/index.d.ts', resolved: false }])
  })

  it('reports an unemitted declaration file as unresolved rather than dropping it', () => {
    const manifest = { exports: { '.': { types: './dist/index.d.ts' } } }

    const [entry] = entrypointsOf('@poveste/app', '/pkg', manifest, () => false)

    expect(entry.resolved).toBe(false)
  })

  it('returns nothing for a package that declares no types at all', () => {
    expect(entrypointsOf('@poveste/vendors', '/pkg', {}, everythingExists)).toEqual([])
  })
})

describe('typesConditionOf', () => {
  it('reads a types condition at the top level', () => {
    expect(typesConditionOf({ types: './dist/index.d.ts', default: './dist/index.js' })).toBe('./dist/index.d.ts')
  })

  it('reads a types condition nested under import or require', () => {
    const entry = { import: { types: './dist/index.d.mts', default: './dist/index.mjs' } }

    expect(typesConditionOf(entry)).toBe('./dist/index.d.mts')
  })

  it('returns null for a plain string entry, so the manifest fallback still applies', () => {
    expect(typesConditionOf('./dist/index.js')).toBeNull()
  })

  it('returns null for conditions that declare no types anywhere', () => {
    expect(typesConditionOf({ import: './dist/index.mjs', require: './dist/index.cjs' })).toBeNull()
  })
})

describe('entrypointsOf, with nested conditions', () => {
  it('finds a root declared only under a nested condition, rather than falling back to source', () => {
    // Falling through here measured `@poveste/app`'s `types: ./src/index.ts` —
    // source, not the emitted declarations a consumer receives.
    const manifest = { exports: { '.': { import: { types: './dist/index.d.mts' } } }, types: './src/index.ts' }

    const entries = entrypointsOf('@poveste/app', '/pkg', manifest, everythingExists)

    expect(entries).toEqual([{ specifier: '@poveste/app', types: '/pkg/dist/index.d.mts', resolved: true }])
  })
})

describe('the UNRESOLVED list', () => {
  it('gives every exemption a reason, not just a name', () => {
    for (const [specifier, reason] of Object.entries(UNRESOLVED)) {
      expect(reason, specifier).not.toHaveLength(0)
    }
  })
})

describe('formatRows', () => {
  it('puts the widest surface first, where a sentence buys most', () => {
    const rows = [coverage('@poveste/plugin-nuxt', 0, 4), coverage('poveste', 8, 92)]

    const [first] = formatRows(rows)

    expect(first).toContain('poveste')
    expect(first).toContain('92')
  })

  it('reports a fully undocumented entrypoint as 0%, not as a blank', () => {
    const [line] = formatRows([coverage('@poveste/plugin-vue', 0, 5)])

    expect(line).toContain('0 /    5')
    expect(line).toContain('0%')
  })
})

describe('summarise', () => {
  it('totals across entrypoints rather than averaging their percentages', () => {
    const rows = [coverage('poveste', 8, 92), coverage('poveste/plugin', 2, 2)]

    expect(summarise(rows)).toEqual({ documented: 10, total: 94, pct: 11 })
  })

  it('reports 0% rather than NaN when there is nothing to measure', () => {
    expect(summarise([])).toEqual({ documented: 0, total: 0, pct: 0 })
  })
})

// The guard this check is exempted for lives in `main()`, and deleting its
// `process.exit(1)` left every assertion above green (#719). So the status is
// asserted over a tree where the guard has to fire, together with the guard's
// own message. Only this direction: a passing run measures emitted
// declarations, so it needs a built tree.
// Also the guard's own message: a crash on a missing file exits non-zero too, and would pass a
// status-only assertion for the wrong reason. And with no stack trace, because a
// guard that prints and then falls through to a crash on the next read looks the
// same from outside — and exits 0 in any tree where that read happens to work.
describe('the check as a process', () => {
  // `@poveste/app` is published with types that do not resolve, which is exactly
  // what `UNRESOLVED` excuses. An empty tree would not reach the guard at all:
  // the excuse would be stale, and that problem fires first.
  it('exits non-zero when nothing could be measured', () => {
    const run = runCheck('check-doc-coverage.ts', ['--root', tree({
      'CONTRIBUTING.md': '',
      'packages/poveste-app/package.json': '{ "name": "@poveste/app", "version": "1.0.0", "types": "./dist/index.d.ts" }\n',
    })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('no entrypoint was measured at all')
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
    removeTrees()
  })
})
