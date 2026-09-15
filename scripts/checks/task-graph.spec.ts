import { describe, expect, it } from 'vitest'
import { assertNoProblems } from '../assert-no-problems.ts'
import { tree } from '../fixture-tree.ts'
import { afterBuild, beforeBuild, chainSteps, checkTaskGraph, declaredTasks, EXCLUDED, pipelineSteps, taskGraphProblems } from './task-graph.ts'

const WORKSPACE = `packages:
  - 'packages/*'

tasks:
  lint:
    cache: false
  test:tags:
    cache: false

pipelines:
  checks: [lint, test:tags]
`

const SCRIPTS = {
  'lint': 'eslint .',
  'test:tags': 'node scripts/check-tags.ts',
  'release:check': 'pnpm run lint && pnpm run test:tags && pnpm run build && pnpm run test:smoke',
  'release:report': 'pnpm pipeline checks --full --no-cache --include-workspace-root',
}

describe('declaredTasks', () => {
  // `test:tags` contains a colon, which an earlier regex could not read — it
  // reported every task missing while they were all declared.
  it('reads a task name containing a colon', () => {
    expect(declaredTasks(WORKSPACE)).toEqual(['lint', 'test:tags'])
  })

  it('does not mistake a task option for a task', () => {
    expect(declaredTasks(WORKSPACE)).not.toContain('cache')
  })

  it('is empty when there is no tasks block', () => {
    expect(declaredTasks('packages:\n  - a\n')).toEqual([])
  })
})

describe('pipelineSteps', () => {
  it('reads the named pipeline', () => {
    expect(pipelineSteps(WORKSPACE, 'checks')).toEqual(['lint', 'test:tags'])
  })

  it('is empty for a pipeline that is not declared', () => {
    expect(pipelineSteps(WORKSPACE, 'nope')).toEqual([])
  })
})

describe('chainSteps', () => {
  it('strips the runner so the names match the task names', () => {
    expect(chainSteps('pnpm run a && pnpm run b')).toEqual(['a', 'b'])
  })
})

describe('beforeBuild', () => {
  it('stops at the build, since everything after it needs a built tree', () => {
    expect(beforeBuild(['lint', 'test:tags', 'build', 'test:smoke'])).toEqual(['lint', 'test:tags'])
  })

  it('is the whole chain when nothing builds', () => {
    expect(beforeBuild(['lint'])).toEqual(['lint'])
  })
})

describe('afterBuild', () => {
  it('is everything past the build', () => {
    expect(afterBuild(['lint', 'build', 'test:smoke'])).toEqual(['test:smoke'])
  })

  // Nothing is "after the build" when there is no build, so nothing can be
  // wrongly reported as needing one.
  it('is empty when nothing builds', () => {
    expect(afterBuild(['lint'])).toEqual([])
  })
})

describe('taskGraphProblems', () => {
  // The drift #546 would otherwise have introduced: `lint` moved past the build
  // because a type-aware rule cannot resolve workspace types on a cold tree, and
  // nothing stopped it staying in a report that runs before one. The report
  // would lint an unbuilt workspace and pass.
  // The report is read instead of the chain, so a gap in it has to be stated.
  // These three keep the statement true rather than merely present.
  it('catches an AFTER_BUILD note for a step the chain no longer runs', () => {
    expect(taskGraphProblems(WORKSPACE, SCRIPTS, {}, { 'test:gone': 'a reason' })).toEqual([
      expect.stringContaining('AFTER_BUILD names test:gone, which `release:check` no longer runs at all'),
    ])
  })

  it('catches an AFTER_BUILD note for a step that moved back before the build', () => {
    expect(taskGraphProblems(WORKSPACE, SCRIPTS, {}, { lint: 'a reason' })).toEqual([
      expect.stringContaining('AFTER_BUILD names lint, which `release:check` now runs before the build'),
    ])
  })

  it('catches an AFTER_BUILD note with no reason', () => {
    const scripts = { ...SCRIPTS, 'release:check': 'pnpm run test:tags && pnpm run build && pnpm run lint' }

    expect(taskGraphProblems(WORKSPACE, scripts, {}, { lint: '' })).toContainEqual(
      expect.stringContaining('AFTER_BUILD names lint with no reason'),
    )
  })

  it('catches a pipeline step the chain runs after the build', () => {
    const scripts = { ...SCRIPTS, 'release:check': 'pnpm run test:tags && pnpm run build && pnpm run lint' }

    expect(taskGraphProblems(WORKSPACE, scripts, {}, {})).toEqual([
      expect.stringContaining('names lint, which `release:check` runs after the build'),
    ])
  })

  it('is empty when the graph matches the chain', () => {
    expect(taskGraphProblems(WORKSPACE, SCRIPTS, {}, {})).toEqual([])
  })

  it('catches a pre-build step the report would not cover', () => {
    const scripts = { ...SCRIPTS, 'release:check': 'pnpm run lint && pnpm run test:tags && pnpm run test:mirrors && pnpm run build' }
    expect(taskGraphProblems(WORKSPACE, scripts, {}, {})).toEqual([expect.stringContaining('test:mirrors')])
  })

  it('accepts a pre-build step that is excluded with a reason', () => {
    const scripts = { ...SCRIPTS, 'release:check': 'pnpm run lint && pnpm run test:tags && pnpm run test:mirrors && pnpm run build' }
    expect(taskGraphProblems(WORKSPACE, scripts, { 'test:mirrors': 'why' }, {})).toEqual([])
  })

  it('catches a stale exclusion', () => {
    expect(taskGraphProblems(WORKSPACE, SCRIPTS, { 'test:gone': 'why' }, {})).toEqual([expect.stringContaining('delete the entry')])
  })

  // Without the flag pnpm leaves the root out, skips every root script and
  // exits 0 — measured at 100 tasks, 0 failed, 100 skipped, with two real
  // failures in the tree.
  it('catches a report that would skip every root script and pass', () => {
    const scripts = { ...SCRIPTS, 'release:report': 'pnpm pipeline checks --full --no-cache' }
    expect(taskGraphProblems(WORKSPACE, scripts, {}, {})).toEqual([expect.stringContaining('--include-workspace-root')])
  })

  // pnpm selects only what changed since the base by default. It warns and
  // expands when a root file changes, but a warning is not a guarantee.
  it('catches a report left on the affected-since-base selection', () => {
    const scripts = { ...SCRIPTS, 'release:report': 'pnpm pipeline checks --no-cache --include-workspace-root' }
    expect(taskGraphProblems(WORKSPACE, scripts, {}, {})).toEqual([expect.stringContaining('--full')])
  })

  it('catches caching being switched on before its measurement', () => {
    const scripts = { ...SCRIPTS, 'release:report': 'pnpm pipeline checks --full --include-workspace-root' }
    expect(taskGraphProblems(WORKSPACE, scripts, {}, {})).toEqual([expect.stringContaining('--no-cache')])
  })

  it('catches the report script being deleted while the graph stays', () => {
    const { 'release:report': _, ...scripts } = SCRIPTS
    expect(taskGraphProblems(WORKSPACE, scripts, {}, {})).toEqual([expect.stringContaining('never run')])
  })

  it('catches a task that is not a root script', () => {
    const workspace = WORKSPACE.replace('tasks:\n', 'tasks:\n  test:imaginary:\n    cache: false\n')
    expect(taskGraphProblems(workspace, SCRIPTS, {}, {})).toEqual([expect.stringContaining('test:imaginary')])
  })

  // The floor. Both inputs are found by regex over the workspace file, so a
  // rename there leaves this function with two empty lists — and every case
  // above passes over them without a word (#719).
  describe('when the workspace declares neither input', () => {
    const NOTHING = `packages:\n  - 'packages/*'\n`

    it('reports a missing tasks block rather than a clean graph', () => {
      expect(taskGraphProblems(NOTHING, SCRIPTS, {}, {})).toContainEqual(
        expect.stringContaining('declares no `tasks:`'),
      )
    })

    it('reports a missing pipeline rather than a clean graph', () => {
      expect(taskGraphProblems(NOTHING, SCRIPTS, {}, {})).toContainEqual(
        expect.stringContaining('declares no `pipelines.checks`'),
      )
    })
  })
})

describe('the exclusion list', () => {
  it('gives every entry a reason', () => {
    for (const [step, reason] of Object.entries(EXCLUDED)) expect(reason, step).not.toHaveLength(0)
  })
})

describe('checkTaskGraph', () => {
  it('reports a workspace that declares no task graph', () => {
    const root = tree({ 'pnpm-workspace.yaml': 'packages: []\n', 'package.json': '{ "scripts": { "release:check": "pnpm run test:tags && pnpm run build" } }\n' })

    expect(checkTaskGraph(root).problems).toContainEqual(expect.stringContaining('declares no `tasks:`'))
  })

  it('the task graph matches release:check', { tags: ['check', 'ci'] }, () => {
    assertNoProblems(checkTaskGraph())
  })
})
