import type { DependencyRange } from './dependency-engines.ts'
import { describe, expect, it } from 'vitest'
import { admitsMore, checkDependencyEngines, collect, engineProblems, walkProblems } from './dependency-engines.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

function dependency(range: string | undefined, declared = '>=24.15.0'): DependencyRange {
  return { pkg: 'poveste', declared, dependency: 'jsdom', version: '30.1.1', range }
}

describe('admitsMore', () => {
  it('is false when the dependency accepts every Node the package does', () => {
    expect(admitsMore('>=24.15.0', '>=20')).toBe(false)
  })

  // #1075 as it was: three closed windows under one open floor.
  it('is true when the dependency refuses a window in the middle', () => {
    expect(admitsMore('>=22.22.2', '^22.22.2 || ^24.15.0 || >=26.0.0')).toBe(true)
  })
})

describe('engineProblems', () => {
  it('is silent when every dependency accepts the whole range', () => {
    expect(engineProblems([dependency('>=20')], {})).toEqual([])
  })

  it('is silent on a dependency that declares no range', () => {
    expect(engineProblems([dependency(undefined)], {})).toEqual([])
  })

  it('names a gap nobody recorded, with both ranges', () => {
    expect(engineProblems([dependency('^24.15.0 || >=26.0.0')], {})).toEqual([
      'poveste -> jsdom: poveste admits Node >=24.15.0, and jsdom@30.1.1 requires ^24.15.0 || >=26.0.0, so a strict install fails on the versions between',
    ])
  })

  it('accepts a gap recorded against the dependency\'s exact range', () => {
    const exempt = { 'poveste -> jsdom': { admits: '>=24.15.0', range: '^24.15.0 || >=26.0.0', reason: 'Node 25 is past end of life' } }

    expect(engineProblems([dependency('^24.15.0 || >=26.0.0')], exempt)).toEqual([])
  })

  it('reopens the question when the dependency\'s range moves', () => {
    const exempt = { 'poveste -> jsdom': { admits: '>=24.15.0', range: '^24.15.0 || >=26.0.0', reason: 'Node 25 is past end of life' } }

    expect(engineProblems([dependency('^24.15.0 || >=27.0.0')], exempt)).toEqual([
      expect.stringMatching(/^poveste -> jsdom: jsdom@30\.1\.1 now requires Node \^24\.15\.0 \|\| >=27\.0\.0, and the recorded exemption was for/),
    ])
  })

  // The floor dropped from 24.15.0 to 22.22.2 (#1226), and the gap an exemption
  // had accepted widened to Node 24.0–24.14 with nothing said.
  it('reopens the question when the package\'s own range moves', () => {
    const exempt = { 'poveste -> jsdom': { admits: '>=24.15.0', range: '^22.22.2 || ^24.15.0 || >=26.0.0', reason: 'Node 25 is past end of life' } }

    expect(engineProblems([dependency('^22.22.2 || ^24.15.0 || >=26.0.0', '>=22.22.2')], exempt)).toEqual([
      'poveste -> jsdom: poveste now admits Node >=22.22.2, and the recorded exemption was accepted against >=24.15.0. Re-decide it against the new range',
    ])
  })

  it('reports an exemption with no gap left behind it', () => {
    const exempt = { 'poveste -> jsdom': { admits: '>=24.15.0', range: '^24.15.0 || >=26.0.0', reason: 'Node 25 is past end of life' } }

    expect(engineProblems([dependency('>=20')], exempt)).toEqual(['poveste -> jsdom: exempted, but the gap is gone. Delete the exemption'])
  })
})

describe('collect', () => {
  it('reads each published package\'s dependencies from its own directory', () => {
    const root = tree({
      'packages/one/package.json': JSON.stringify({ name: '@fixture/one', engines: { node: '>=24.15.0' }, dependencies: { dep: '1' } }),
      'packages/one/node_modules/dep/package.json': JSON.stringify({ name: 'dep', version: '1.0.0', engines: { node: '^24.15.0 || >=26' } }),
      'packages/private/package.json': JSON.stringify({ name: '@fixture/private', private: true, engines: { node: '>=24.15.0' }, dependencies: { dep: '1' } }),
    })

    expect(collect(root)).toEqual({
      ranges: [{ pkg: '@fixture/one', declared: '>=24.15.0', dependency: 'dep', version: '1.0.0', range: '^24.15.0 || >=26' }],
      packages: ['@fixture/one'],
      unresolved: [],
    })
  })

  it('reports a dependency it could not read rather than skipping it', () => {
    const root = tree({
      'packages/one/package.json': JSON.stringify({ name: '@fixture/one', engines: { node: '>=24.15.0' }, dependencies: { missing: '1' } }),
    })

    expect(walkProblems(collect(root))).toContainEqual(expect.stringContaining('@fixture/one -> missing: could not read'))
  })
})

describe('checkDependencyEngines', () => {
  it('every published package\'s dependencies accept its Node range, or the gap is recorded', { tags: ['check', 'versions'] }, () => {
    assertNoProblems(checkDependencyEngines())
  })
})
