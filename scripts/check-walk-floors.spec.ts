import { cpSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkScripts, citationProblems, exportsFloor, floorIsExercised, floorProblems, hasFloor } from './check-walk-floors.ts'
import { removeTrees, tree } from './fixture-tree.ts'
import { runCheck } from './run-check.ts'

const SCRIPTS = dirname(fileURLToPath(import.meta.url))

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

describe('exportsFloor', () => {
  it('sees an async floor', () => {
    expect(exportsFloor('export async function walkProblems(): Promise<string[]> { return [] }')).toBe(true)
  })

  // `collect` is already async in `check-versions`, so a floor that has to
  // `stat` its inputs is a matter of time. Reporting one as missing would push
  // its author toward an exemption for a check that has one.
  it('sees a floor declared as a const', () => {
    expect(exportsFloor('export const walkProblems = (walk: Walk): string[] => []')).toBe(true)
  })

  it('does not count a floor read from another check as this one exporting it', () => {
    expect(exportsFloor('import { walkProblems } from \'./check-publishable.ts\'')).toBe(false)
  })
})

describe('floorIsExercised', () => {
  it('is true when a spec importing the check reaches its floor', () => {
    const specs = { 'check-a.spec.ts': 'import { collect, walkProblems } from \'./check-a.ts\'\nwalkProblems(collect(root))' }

    expect(floorIsExercised('check-a.ts', specs)).toBe(true)
  })

  // The hole this closes. A floor that always returns an empty array satisfies
  // every pattern in this file and can never produce a problem, and it is the
  // shortest way past a failure someone reads as an obstacle.
  it('is false when the check has a spec that never reaches the floor', () => {
    const specs = { 'check-a.spec.ts': 'import { collect } from \'./check-a.ts\'\ncollect(root)' }

    expect(floorIsExercised('check-a.ts', specs)).toBe(false)
  })

  it('does not accept another check\'s spec reaching its own floor', () => {
    const specs = { 'check-b.spec.ts': 'import { walkProblems } from \'./check-b.ts\'' }

    expect(floorIsExercised('check-a.ts', specs)).toBe(false)
  })
})

describe('citationProblems', () => {
  const SPECS = ['check-task-graph.spec.ts']

  it('is silent when a named function is still in the check', () => {
    expect(citationProblems('check-task-graph.ts', 'guarded in `taskGraphProblems`', 'export function taskGraphProblems() {}', SPECS)).toEqual([])
  })

  it('catches a function the reason outlived', () => {
    const problems = citationProblems('check-task-graph.ts', 'guarded in `taskGraphProblems`', 'export function somethingElse() {}', SPECS)

    expect(problems).toEqual([expect.stringContaining('names `taskGraphProblems`, which is not in check-task-graph.ts')])
  })

  it('is silent when a cited spec is there', () => {
    expect(citationProblems('check-task-graph.ts', 'asserted in `check-task-graph.spec.ts`', '', SPECS)).toEqual([])
  })

  it('catches a cited spec that is not', () => {
    const problems = citationProblems('check-task-graph.ts', 'asserted in `check-gone.spec.ts`', '', SPECS)

    expect(problems).toEqual([expect.stringContaining('cites check-gone.spec.ts')])
  })

  // Everything else a reason backticks is prose, and reading it as a symbol
  // would fail every entry in the record rather than the wrong ones.
  it('reads none of the prose a reason quotes', () => {
    const prose = 'guarded in `main()` over an empty `tasks:` block, reachable only with `--root`, from `export interface PovesteConfig`'

    expect(citationProblems('check-task-graph.ts', prose, '', SPECS)).toEqual([])
  })

  it('reports every bad citation in one reason, not the first', () => {
    const problems = citationProblems('check-task-graph.ts', '`goneOne` and `goneTwo`', '', SPECS)

    expect(problems).toHaveLength(2)
  })
})

describe('floorProblems', () => {
  const guarded = 'export function walkProblems(): string[] { return [] }'
  const exercised = { 'check-a.spec.ts': 'import { walkProblems } from \'./check-a.ts\'' }

  it('is silent when every check is guarded or explained', () => {
    expect(floorProblems(
      ['check-a.ts', 'check-b.ts'],
      { 'check-a.ts': guarded, 'check-b.ts': 'nothing' },
      { 'check-b.ts': 'a reason' },
      exercised,
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
    expect(floorProblems(['check-a.ts'], { 'check-a.ts': guarded }, { 'check-a.ts': 'a reason' }, exercised)).toEqual([
      expect.stringContaining('check-a.ts has a floor now'),
    ])
  })

  it('names an exemption for a check that no longer exists', () => {
    expect(floorProblems(['check-a.ts'], { 'check-a.ts': guarded }, { 'check-gone.ts': 'a reason' }, exercised)).toEqual([
      expect.stringContaining('WITHOUT_FLOOR names check-gone.ts, which is not a check'),
    ])
  })

  it('requires a reason rather than an empty one', () => {
    expect(floorProblems(['check-a.ts'], { 'check-a.ts': 'nothing' }, { 'check-a.ts': '' })).toEqual([
      expect.stringContaining('check-a.ts neither asserts'),
      expect.stringContaining('with no reason'),
    ])
  })

  it('names a floor that no spec reaches', () => {
    expect(floorProblems(['check-a.ts'], { 'check-a.ts': guarded }, {}, {})).toEqual([
      expect.stringContaining('check-a.ts exports a `walkProblems` that no spec reaches'),
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

// `floorProblems` returning a problem says nothing about what `main()` does
// with it. Deleting the `process.exit(1)` left every spec above green while the
// check reported success over each of the four mutations it exists to catch —
// this file's own defect, committed inside it.
//
// So the status is asserted in both directions, and the message is required to
// name the file, because a non-zero exit that does not say which check is
// wrong sends the reader to read all twenty.
describe('the check as a process', () => {
  it('exits 0 over the repository it actually ships with', () => {
    expect(runCheck('check-walk-floors.ts').status).toBe(0)
  })

  /**
   * A copy of the real `scripts/`, plus whatever the case injects.
   *
   * `WITHOUT_FLOOR` travels with this file rather than with the tree, so a
   * fixture holding two invented checks makes all fourteen entries stale and
   * the run fails for that instead — which would let these pass without the
   * injected fault being noticed at all. Copying the real directory keeps the
   * record current, so a non-zero status means the thing that was injected.
   */
  function scriptsPlus(files: Record<string, string>): string {
    const root = tree({ 'keep.txt': '' })
    cpSync(SCRIPTS, join(root, 'scripts'), { recursive: true })
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(root, 'scripts', name), content)
    }
    return root
  }

  it('exits 0 over a copy of the real scripts/ with nothing injected', () => {
    expect(runCheck('check-walk-floors.ts', ['--root', scriptsPlus({})]).status).toBe(0)
    removeTrees()
  })

  it('exits non-zero over a check that is neither guarded nor explained', () => {
    const run = runCheck('check-walk-floors.ts', ['--root', scriptsPlus({ 'check-unclassified.ts': 'export function nothing(): void {}\n' })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('check-unclassified.ts neither asserts that it reached its inputs')
    removeTrees()
  })

  it('exits non-zero over a floor no spec reaches', () => {
    const run = runCheck('check-walk-floors.ts', ['--root', scriptsPlus({ 'check-stub.ts': 'export function walkProblems(): string[] { return [] }\n' })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('check-stub.ts exports a `walkProblems` that no spec reaches')
    removeTrees()
  })
})
