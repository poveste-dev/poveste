import { describe, expect, it } from 'vitest'
import { ALLOWED, hardcodedNodeVersions, lowestVersion, nodeVersionProblems } from './check-node-versions.ts'

const ENGINES = '^22.22.2 || ^24.15.0 || >=26.0.0'
const FLOOR = { workflow: 'test.yml', line: 319, value: '22.22.2' }

describe('hardcodedNodeVersions', () => {
  it('finds a pinned version and reports where it is', () => {
    const content = 'jobs:\n  build:\n    steps:\n      - with:\n          node-version: 26\n'

    expect(hardcodedNodeVersions('test.yml', content)).toEqual([{ workflow: 'test.yml', line: 5, value: '26' }])
  })

  it('does not mistake node-version-file for a pinned version', () => {
    const content = '          node-version-file: .node-version\n'

    expect(hardcodedNodeVersions('test.yml', content)).toEqual([])
  })

  it('reads a quoted version', () => {
    const content = `          node-version: '22.22.2'\n`

    expect(hardcodedNodeVersions('test.yml', content)[0].value).toBe('22.22.2')
  })

  it('stops at a trailing comment rather than swallowing it', () => {
    const content = '          node-version: 26 # the toolchain\n'

    expect(hardcodedNodeVersions('test.yml', content)[0].value).toBe('26')
  })
})

describe('nodeVersionProblems', () => {
  it('is empty when only the deliberate floor is pinned', () => {
    expect(nodeVersionProblems([FLOOR], ALLOWED, ENGINES)).toEqual([])
  })

  it('names a workflow that pins a version instead of reading the file', () => {
    const problems = nodeVersionProblems([FLOOR, { workflow: 'nightly.yml', line: 18, value: '26' }], ALLOWED, ENGINES)

    expect(problems).toEqual([expect.stringContaining('nightly.yml:18')])
  })

  it('says what to write instead, since the fix is the point', () => {
    const [problem] = nodeVersionProblems([FLOOR, { workflow: 'nightly.yml', line: 18, value: '26' }], ALLOWED, ENGINES)

    expect(problem).toContain('node-version-file: .node-version')
  })

  it('rejects a floor that engines.node does not admit', () => {
    const problems = nodeVersionProblems([{ ...FLOOR, value: '21.0.0' }], ALLOWED, ENGINES)

    expect(problems).toEqual([expect.stringContaining('use `node-version-file: .node-version`')])
  })

  // The substring test this replaced accepted `26` against `>=26.0.0`, which
  // left the floor job running at the top of the range.
  it('rejects a floor sitting at the top of the range rather than the bottom', () => {
    const allowed = { 'test.yml': { value: '26.0.0', reason: 'x' } }
    const problems = nodeVersionProblems([{ ...FLOOR, value: '26.0.0' }], allowed, ENGINES)

    expect(problems).toEqual([expect.stringContaining('the lowest version `engines.node`')])
  })

  it('rejects a second pin in the allowed workflow', () => {
    const problems = nodeVersionProblems([FLOOR, { ...FLOOR, line: 420 }], ALLOWED, ENGINES)

    expect(problems).toEqual([expect.stringContaining('2 times')])
  })

  it('rejects a differently-versioned pin in the allowed workflow', () => {
    const problems = nodeVersionProblems([FLOOR, { workflow: 'test.yml', line: 420, value: '26' }], ALLOWED, ENGINES)

    expect(problems).toEqual([expect.stringContaining('test.yml:420 pins Node 26')])
  })

  it('says so when engines.node names nothing to check the floor against', () => {
    const problems = nodeVersionProblems([FLOOR], ALLOWED, '*')

    expect(problems).toEqual([expect.stringContaining('names no concrete version')])
  })

  it('rejects an allowance for a workflow that no longer pins anything', () => {
    const problems = nodeVersionProblems([], ALLOWED, ENGINES)

    expect(problems).toEqual([expect.stringContaining('delete the entry')])
  })
})

describe('lowestVersion', () => {
  it('picks the lowest literal a range names, not the first', () => {
    expect(lowestVersion('>=26.0.0 || ^22.22.2 || ^24.15.0')).toBe('22.22.2')
  })

  it('compares numerically rather than as strings', () => {
    expect(lowestVersion('^9.0.0 || ^10.0.0')).toBe('9.0.0')
  })

  it('is undefined when a range names no concrete version', () => {
    expect(lowestVersion('*')).toBeUndefined()
  })
})

describe('the allowance list', () => {
  it('gives every entry a reason, not just a name', () => {
    for (const [workflow, allowance] of Object.entries(ALLOWED)) {
      expect(allowance.reason, workflow).not.toHaveLength(0)
    }
  })

  it('pins the value each allowance permits, so a changed literal is drift', () => {
    for (const [workflow, allowance] of Object.entries(ALLOWED)) {
      expect(allowance.value, workflow).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })
})
