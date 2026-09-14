import { describe, expect, it } from 'vitest'
import { checkScripts, floorProblems, hasFloor } from './check-walk-floors.ts'
import { removeTrees, tree } from './fixture-tree.ts'
import { runCheck } from './run-check.ts'

describe('hasFloor', () => {
  it('sees a check that exports its own floor', () => {
    expect(hasFloor('export function walkProblems({ pages }: Walk): string[] {\n  return []\n}')).toBe(true)
  })

  it('sees a check that reads the floor of the walk it shares', () => {
    expect(hasFloor('import { walkPackages, walkProblems } from \'./check-publishable.ts\'')).toBe(true)
  })

  // The first version matched the word anywhere, so this file's own message
  // telling an author to add a `walkProblems` made it report itself as guarded.
  // A detector that fires on a mention of the thing it detects is the defect
  // #719 is about, one level up.
  it('is not fooled by a message that merely names one', () => {
    expect(hasFloor('problems.push(`add a `walkProblems`, or an entry to WITHOUT_FLOOR`)')).toBe(false)
  })

  it('is not fooled by an import from somewhere that is not a sibling check', () => {
    expect(hasFloor('import { walkProblems } from \'some-package\'')).toBe(false)
  })
})

describe('floorProblems', () => {
  const guarded = 'export function walkProblems(): string[] { return [] }'

  it('is silent when every check is guarded or explained', () => {
    expect(floorProblems(
      ['check-a.ts', 'check-b.ts'],
      { 'check-a.ts': guarded, 'check-b.ts': 'nothing' },
      { 'check-b.ts': 'a reason' },
    )).toEqual([])
  })

  // The case this exists for: the next check added to scripts/ inherits none of
  // the sweep's reasoning, and nothing would have noticed.
  it('names a check that is neither guarded nor explained', () => {
    expect(floorProblems(['check-new.ts'], { 'check-new.ts': 'nothing' }, {})).toEqual([
      expect.stringContaining('check-new.ts neither asserts that it reached its inputs nor says why'),
    ])
  })

  it('names an exemption for a check that has since grown a floor', () => {
    expect(floorProblems(['check-a.ts'], { 'check-a.ts': guarded }, { 'check-a.ts': 'a reason' })).toEqual([
      expect.stringContaining('check-a.ts has a floor now'),
    ])
  })

  it('names an exemption for a check that no longer exists', () => {
    expect(floorProblems(['check-a.ts'], { 'check-a.ts': guarded }, { 'check-gone.ts': 'a reason' })).toEqual([
      expect.stringContaining('WITHOUT_FLOOR names check-gone.ts, which is not a check'),
    ])
  })

  it('requires a reason rather than an empty one', () => {
    expect(floorProblems(['check-a.ts'], { 'check-a.ts': 'nothing' }, { 'check-a.ts': '' })).toEqual([
      expect.stringContaining('check-a.ts neither asserts'),
      expect.stringContaining('with no reason'),
    ])
  })

  // Its own walk, held to the rule it enforces.
  it('fails when it found no checks to classify at all', () => {
    expect(floorProblems([], {}, {})).toEqual([expect.stringContaining('held no check to classify')])
  })
})

describe('checkScripts', () => {
  it('finds checks and passes over their specs and everything else', () => {
    const root = tree({
      'scripts/check-one.ts': '',
      'scripts/check-one.spec.ts': '',
      'scripts/fixture-tree.ts': '',
      'scripts/release.ts': '',
    })

    expect(checkScripts(`${root}/scripts`)).toEqual(['check-one.ts'])
    removeTrees()
  })
})

describe('the check as a process', () => {
  it('exits 0 over the repository it actually ships with', () => {
    expect(runCheck('check-walk-floors.ts').status).toBe(0)
  })
})
