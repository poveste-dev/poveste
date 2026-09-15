import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkScripts, citationProblems, exitProblems, exportsFloor, failureIsAsserted, floorIsExercised, floorProblems, hasFailureExit, hasFloor } from './check-walk-floors.ts'
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

describe('hasFailureExit', () => {
  it('sees a check that exits non-zero', () => {
    expect(hasFailureExit('if (problems.length > 0) {\n  process.exit(1)\n}')).toBe(true)
  })

  it('sees one that sets the exit code instead', () => {
    expect(hasFailureExit('process.exitCode = 1')).toBe(true)
  })

  // A conditional exit can fail. Reading it as unable to would ask for an
  // exemption that never goes stale, switching the rule off for that check.
  it.each([
    'process.exit(problems.length > 0 ? 1 : 0)',
    'process.exitCode = problems.length ? 1 : 0',
    'process.exit(2)',
    'process.exit(code)',
  ])('sees %s as a way to fail', (line) => {
    expect(hasFailureExit(line)).toBe(true)
  })

  it.each(['process.exit(0)', 'process.exit()', 'if (process.exitCode === 1) warn()'])('does not see %s as a way to fail', (line) => {
    expect(hasFailureExit(line)).toBe(false)
  })

  // Three checks explain in a comment why importing them cannot reach the exit,
  // which is how #760's table counted three calls too many.
  it('is not fooled by a comment that mentions the exit', () => {
    expect(hasFailureExit('// cannot reach `process.exit(1)` and kill the runner\n * or the process.exit(1) above')).toBe(false)
  })
})

describe('failureIsAsserted', () => {
  it('sees a spec that runs the check and expects it to fail', () => {
    const specs = { 'check-a.spec.ts': 'it(\'fails\', () => {\n  expect(runCheck(\'check-a.ts\', [\'--root\', root]).status).toBe(1)\n})' }

    expect(failureIsAsserted('check-a.ts', specs)).toBe(true)
  })

  it('sees a result bound in the same test', () => {
    const specs = { 'check-a.spec.ts': 'it(\'fails\', () => {\n  const run = runCheck(\'check-a.ts\', [])\n\n  expect(run.status).toBe(1)\n})' }

    expect(failureIsAsserted('check-a.ts', specs)).toBe(true)
  })

  // The shape `check-publishable.spec.ts` uses: one helper, asserted in a later test.
  it('sees a helper bound to the check', () => {
    const specs = { 'check-a.spec.ts': 'const run = (root: string) => runCheck(\'check-a.ts\', [\'--root\', root])\n\nit(\'fails\', () => {\n  expect(run(root).status).toBe(1)\n})' }

    expect(failureIsAsserted('check-a.ts', specs)).toBe(true)
  })

  // The hole #760 measured: a spec that runs the check and only ever expects 0.
  it('is false when the check is only ever expected to pass', () => {
    const specs = { 'check-a.spec.ts': 'it(\'passes\', () => {\n  expect(runCheck(\'check-a.ts\').status).toBe(0)\n})' }

    expect(failureIsAsserted('check-a.ts', specs)).toBe(false)
  })

  it('accepts another spec doing the asserting', () => {
    const specs = { 'run-check.spec.ts': 'it(\'reports\', () => {\n  expect(runCheck(\'check-a.ts\', [\'--root\', root]).status).toBe(1)\n})' }

    expect(failureIsAsserted('check-a.ts', specs)).toBe(true)
  })

  // `run-check.spec.ts` expects one check to pass and another to fail. Matching
  // the whole file would credit the first with the second's assertion.
  it('does not credit a check with a failure asserted about a different one', () => {
    const specs = { 'run-check.spec.ts': 'it(\'passes\', () => {\n  expect(runCheck(\'check-a.ts\').status).toBe(0)\n})\n\nit(\'fails\', () => {\n  expect(runCheck(\'check-b.ts\', []).status).toBe(1)\n})' }

    expect(failureIsAsserted('check-a.ts', specs)).toBe(false)
  })
})

describe('failureIsAsserted, over the spec shapes that hid or faked a watch', () => {
  const lines = (...parts: string[]): string => parts.join('\n')
  const asserted = (spec: string): boolean => failureIsAsserted('check-a.ts', { 's.spec.ts': spec })

  // An assertion that never runs watches nothing.
  it.each(['it.skip', 'test.skip', 'xit', 'it.todo', 'it.skipIf(process.env.CI)'])('does not count a test declared with %s', (head) => {
    expect(asserted(lines(`${head}("fails", () => {`, '  expect(runCheck("check-a.ts", []).status).toBe(1)', '})'))).toBe(false)
  })

  it('does not count a test inside a skipped suite', () => {
    expect(asserted(lines('describe.skip("off", () => {', '  it("fails", () => {', '    expect(runCheck("check-a.ts", []).status).toBe(1)', '  })', '})'))).toBe(false)
  })

  it('counts a test after a skipped suite has closed', () => {
    expect(asserted(lines('describe.skip("off", () => {', '  it("x", () => {})', '})', 'describe("on", () => {', '  it("fails", () => {', '    expect(runCheck("check-a.ts", []).status).toBe(1)', '  })', '})'))).toBe(true)
  })

  // Only `it(` used to start a block, so this one merged into the test above and
  // lent it check-b's failure.
  it('does not credit a check with a parameterised test about a different one', () => {
    expect(asserted(lines('it("passes", () => {', '  expect(runCheck("check-a.ts").status).toBe(0)', '})', 'it.each([1])("fails %s", () => {', '  expect(runCheck("check-b.ts", []).status).toBe(1)', '})'))).toBe(false)
  })

  it('does not credit a test with a run a following suite header holds', () => {
    expect(asserted(lines('it("fails", () => {', '  expect(runCheck("check-b.ts", []).status).toBe(1)', '})', 'describe("next", () => {', '  const result = runCheck("check-a.ts", [])', '  it("passes", () => {', '    expect(result.status).toBe(0)', '  })', '})'))).toBe(false)
  })

  it('counts a parameterised test that does watch it fail', () => {
    expect(asserted(lines('it.each(["a", "b"])("fails over %s", (root) => {', '  expect(runCheck("check-a.ts", ["--root", root]).status).toBe(1)', '})'))).toBe(true)
  })

  it('sees a helper with a return type', () => {
    expect(asserted(lines('const run = (root: string): CheckRun => runCheck("check-a.ts", ["--root", root])', 'it("fails", () => {', '  expect(run(root).status).toBe(1)', '})'))).toBe(true)
  })

  it('sees a helper whose body is on the next line', () => {
    expect(asserted(lines('const run = (root: string) =>', '  runCheck("check-a.ts", ["--root", root])', 'it("fails", () => {', '  expect(run(root).status).toBe(1)', '})'))).toBe(true)
  })

  it('sees a function helper', () => {
    expect(asserted(lines('function run(root: string) {', '  return runCheck("check-a.ts", ["--root", root])', '}', 'it("fails", () => {', '  expect(run(root).status).toBe(1)', '})'))).toBe(true)
  })

  it('sees a result held by the suite and asserted in a test', () => {
    expect(asserted(lines('describe("p", () => {', '  const result = runCheck("check-a.ts", ["--root", root])', '  it("fails", () => {', '    expect(result.status).toBe(1)', '  })', '})'))).toBe(true)
  })

  it('does not credit a name the test has rebound to another check', () => {
    expect(asserted(lines('const run = (root: string) => runCheck("check-a.ts", [root])', 'it("fails", () => {', '  const run = runCheck("check-b.ts", [])', '  expect(run.status).toBe(1)', '})'))).toBe(false)
  })

  it('accepts a status asserted as greater than zero', () => {
    expect(asserted(lines('it("fails", () => {', '  const run = runCheck("check-a.ts", [])', '  expect(run.status).toBeGreaterThan(0)', '})'))).toBe(true)
  })
})

describe('exitProblems', () => {
  const exits = 'if (problems.length > 0) process.exit(1)'
  const watched = { 'check-a.spec.ts': 'it(\'fails\', () => {\n  expect(runCheck(\'check-a.ts\', []).status).toBe(1)\n})' }

  it('is silent when every check that can fail is watched failing, and the rest say why', () => {
    expect(exitProblems(['check-a.ts', 'check-quiet.ts'], { 'check-a.ts': exits, 'check-quiet.ts': 'console.warn(tags)' }, watched, { 'check-quiet.ts': 'warns only' })).toEqual([])
  })

  it('holds a conditional exit to the same rule, not to an exemption', () => {
    const conditional = 'process.exit(problems.length > 0 ? 1 : 0)'

    expect(exitProblems(['check-a.ts'], { 'check-a.ts': conditional }, watched, {})).toEqual([])
    expect(exitProblems(['check-a.ts'], { 'check-a.ts': conditional }, watched, { 'check-a.ts': 'warns only' })).toEqual([
      expect.stringContaining('check-a.ts has a failure exit now, so its WITHOUT_FAILURE_EXIT entry is stale'),
    ])
  })

  it('names a failure exit that no spec watches', () => {
    expect(exitProblems(['check-a.ts'], { 'check-a.ts': exits }, {}, {})).toEqual([
      expect.stringContaining('check-a.ts can exit non-zero, and no spec runs it as a process'),
    ])
  })

  // The defect itself, caught without a spec: deleting a check's exits leaves it
  // unable to fail, and a check that cannot fail has to say so.
  it('names a check with no failure exit that does not say why', () => {
    expect(exitProblems(['check-a.ts'], { 'check-a.ts': 'console.log(\'done\')' }, watched, {})).toEqual([
      expect.stringContaining('check-a.ts has no failure exit and does not say why'),
    ])
  })

  it('names an entry whose check can fail now', () => {
    expect(exitProblems(['check-a.ts'], { 'check-a.ts': exits }, watched, { 'check-a.ts': 'warns only' })).toEqual([
      expect.stringContaining('check-a.ts has a failure exit now, so its WITHOUT_FAILURE_EXIT entry is stale'),
    ])
  })

  it('names an entry for a check that no longer exists', () => {
    expect(exitProblems(['check-a.ts'], { 'check-a.ts': exits }, watched, { 'check-gone.ts': 'a reason' })).toEqual([
      expect.stringContaining('WITHOUT_FAILURE_EXIT names check-gone.ts, which is not a check'),
    ])
  })

  it('requires a reason rather than an empty one', () => {
    expect(exitProblems(['check-quiet.ts'], { 'check-quiet.ts': 'console.warn(tags)' }, {}, { 'check-quiet.ts': '' })).toEqual([
      expect.stringContaining('WITHOUT_FAILURE_EXIT names check-quiet.ts with no reason'),
    ])
  })

  it('holds a reason to the spec it cites', () => {
    expect(exitProblems(['check-quiet.ts'], { 'check-quiet.ts': 'console.warn(tags)' }, {}, { 'check-quiet.ts': 'asserted in `check-gone.spec.ts`' })).toEqual([
      expect.stringContaining('cites check-gone.spec.ts'),
    ])
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

  // Both halves of #761, injected into a copy of the real tree. Each asserts its
  // edit changed the file first: a replacement that matched nothing would leave
  // a clean copy, and the status below would be about that instead.
  it('exits non-zero over a check whose spec no longer watches it fail', () => {
    const original = readFileSync(join(SCRIPTS, 'check-recipes.spec.ts'), 'utf8')
    const unwatched = original.replaceAll('expect(run.status).toBe(1)', 'expect(run.status).toBeDefined()')
    expect(unwatched).not.toBe(original)

    const run = runCheck('check-walk-floors.ts', ['--root', scriptsPlus({ 'check-recipes.spec.ts': unwatched })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('check-recipes.ts can exit non-zero, and no spec runs it as a process')
    removeTrees()
  })

  it('exits non-zero over a check whose failure exit was deleted', () => {
    const original = readFileSync(join(SCRIPTS, 'check-recipes.ts'), 'utf8')
    const silenced = original.replaceAll('process.exit(1)', 'void 0')
    expect(silenced).not.toBe(original)

    const run = runCheck('check-walk-floors.ts', ['--root', scriptsPlus({ 'check-recipes.ts': silenced })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('check-recipes.ts has no failure exit and does not say why')
    removeTrees()
  })

  it('exits non-zero over a floor no spec reaches', () => {
    const run = runCheck('check-walk-floors.ts', ['--root', scriptsPlus({ 'check-stub.ts': 'export function walkProblems(): string[] { return [] }\n' })])

    expect(run.status).toBe(1)
    expect(run.stderr).toContain('check-stub.ts exports a `walkProblems` that no spec reaches')
    removeTrees()
  })
})
