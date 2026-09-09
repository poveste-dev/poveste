import { describe, expect, it } from 'vitest'
import { EXEMPT, testScriptProblems } from './check-package-tests.ts'

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
  it('gives every exemption a reason, not just a name', () => {
    for (const [name, reason] of Object.entries(EXEMPT)) {
      expect(reason, name).not.toHaveLength(0)
    }
  })
})
