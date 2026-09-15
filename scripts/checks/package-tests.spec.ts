import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { tree } from '../fixture-tree.ts'
import { checkPackageTests, EXEMPT, testScriptProblems } from './package-tests.ts'
import { publishablePackages } from './publishable.ts'

const TESTED = { name: '@poveste/plugin-vue', scripts: { build: 'tsc', test: 'vitest run' } }
const UNTESTED = { name: '@poveste/plugin-percy', scripts: { build: 'tsc' } }

describe('testScriptProblems', () => {
  it('is empty when every published package declares a test script', () => {
    expect(testScriptProblems([TESTED], {})).toEqual([])
  })

  it('names a published package that declares no test script', () => {
    const problems = testScriptProblems([TESTED, UNTESTED], {})

    expect(problems).toEqual([expect.stringContaining('@poveste/plugin-percy')])
  })

  it('says why it matters, since a skipped package looks exactly like a passing one', () => {
    const [problem] = testScriptProblems([UNTESTED], {})

    expect(problem).toContain('skips it without saying so')
  })

  it('accepts a package with no test script when it is exempt', () => {
    expect(testScriptProblems([UNTESTED], { '@poveste/plugin-percy': 'a reason' })).toEqual([])
  })

  it('rejects an exemption for a package that now declares a test script', () => {
    const problems = testScriptProblems([TESTED], { '@poveste/plugin-vue': 'a reason' })

    expect(problems).toEqual([expect.stringContaining('stale')])
  })

  it('rejects an exemption for a package that is not published', () => {
    const problems = testScriptProblems([TESTED], { '@poveste/controls-stories': 'a reason' })

    expect(problems).toEqual([expect.stringContaining('not a published package')])
  })

  it('reports a manifest with no scripts at all rather than throwing', () => {
    expect(testScriptProblems([{ name: '@poveste/vendors' }], {})).toHaveLength(1)
  })
})

describe('the exemption list', () => {
  it.for(Object.entries(EXEMPT).map(([name, reason]) => ({ name, reason })))('$name has a reason, not just a name', ({ reason }) => {
    expect(reason).not.toHaveLength(0)
  })
})

// This check has no walk of its own — it reads `publishablePackages`, which is
// why parameterizing that one function reaches four checks rather than one
// (#719). Nothing in `checks/package-tests.ts` changed to make the below
// possible.
//
// It matters here more than most: the drift that leaves this check green is a
// package quietly leaving the shared list, and a package it never sees is a
// package whose missing `test` script it cannot report — which is #387 and
// #632, the two defects it exists to stop.

function manifest(name: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ name, version: '1.0.0', ...extra })
}

/** What `checkPackageTests` does, with an exemption list a spec chose. */
function problemsUnder(root: string, exempt: Record<string, string> = {}): string[] {
  const manifests = publishablePackages(root).map(({ name, dir }) => ({
    ...JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')),
    name,
  }))

  return testScriptProblems(manifests, exempt)
}

describe('over a tree on disk', () => {
  it('names a published package that declares no test script', () => {
    const root = tree({
      'packages/quiet/package.json': manifest('@fixture/quiet'),
      'packages/tested/package.json': manifest('@fixture/tested', { scripts: { test: 'vitest run' } }),
    })

    expect(problemsUnder(root)).toEqual([expect.stringContaining('@fixture/quiet is published and declares no `test` script')])
  })

  it('says nothing about a private package, which `pnpm test` never selects', () => {
    const root = tree({
      'packages/internal/package.json': manifest('@fixture/internal', { private: true }),
      'packages/tested/package.json': manifest('@fixture/tested', { scripts: { test: 'vitest run' } }),
    })

    expect(problemsUnder(root)).toEqual([])
  })

  it('reports an exemption for a package the walk no longer returns', () => {
    const root = tree({ 'packages/tested/package.json': manifest('@fixture/tested', { scripts: { test: 'vitest run' } }) })

    expect(problemsUnder(root, { '@fixture/gone': 'a reason' })).toEqual([
      expect.stringContaining('EXEMPT names @fixture/gone, which is not a published package'),
    ])
  })
})

describe('checkPackageTests', () => {
  it('reports a published package with no test script', () => {
    const root = tree({ 'packages/untested/package.json': manifest('@fixture/untested') })

    expect(checkPackageTests(root)).toContainEqual(expect.stringContaining('@fixture/untested is published and declares no `test` script'))
  })

  it('every published package declares a test script', { tags: ['check', 'release'] }, () => {
    expect(checkPackageTests(), 'Add a `test` script and a spec, or add the package to EXEMPT in scripts/checks/package-tests.ts with the reason tests are the wrong tool for it.').toEqual([])
  })
})
