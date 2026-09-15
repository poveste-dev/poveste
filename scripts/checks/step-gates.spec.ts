import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { boundariesIn, checkStepGates, collect, gateProblems, jobsIn, masksFailure, statesDependency, walkProblems } from './step-gates.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const WORKFLOWS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'workflows')

function job(steps: string): string {
  return `name: A workflow\n\non:\n  push:\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n${steps}`
}

/** A GitHub expression, built rather than written: `${` in a plain string is a mistake everywhere else. */
function expr(inner: string): string {
  return `\${{ ${inner} }}`
}

describe('jobsIn', () => {
  it('reads a step\'s name, condition and continue-on-error', () => {
    const [parsed] = jobsIn(job(`      - name: Publish\n        if: ${expr('!cancelled()')}\n        continue-on-error: true\n        run: echo hi\n`))

    expect(parsed.id).toBe('build')
    expect(parsed.steps).toEqual([{ name: 'Publish', uses: '', if: expr('!cancelled()'), continueOnError: true }])
  })

  // The `run: |` bodies in this repo hold shell `if` statements, `#` comments
  // and — in `release.yml` — prose about this very rule. Read as config, one of
  // them introduces a step that does not exist and a condition nobody wrote,
  // which is the difference between parsing these files and grepping them.
  it('reads nothing out of a run block, however much it looks like config', () => {
    const [parsed] = jobsIn(job(
      `      - name: Work out what changed
        run: |
          if [ "$EVENT" != pull_request ]; then
            echo "- name: Not a step"
            echo "if: ${expr('always()')}"
          fi
      - name: After
        run: echo hi
`,
    ))

    expect(parsed.steps.map(step => step.name)).toEqual(['Work out what changed', 'After'])
    expect(parsed.steps.every(step => step.if === null)).toBe(true)
  })

  // A job-level `if:` is a different rule. `test-examples.yml`'s `test` job
  // carries `!cancelled()` there, and reading it as a step's would mark every
  // step in the job as running past a failure.
  it('does not read a job\'s own keys as a step\'s', () => {
    const [parsed] = jobsIn(
      `jobs:\n  build:\n    if: ${expr('!cancelled()')}\n    continue-on-error: true\n    steps:\n      - name: One\n        run: echo hi\n`,
    )

    expect(parsed.steps).toEqual([{ name: 'One', uses: '', if: null, continueOnError: false }])
  })

  // `with:` and `env:` sit one level under a step and carry arbitrary keys —
  // `actions/stale` takes one called `exempt-issue-labels`, and nothing stops a
  // future action taking one called `if`.
  it('does not read a nested block\'s keys as the step\'s', () => {
    const [parsed] = jobsIn(job('      - uses: actions/stale@v11.0.0\n        with:\n          if: not mine\n          continue-on-error: true\n'))

    expect(parsed.steps).toEqual([{ name: '', uses: 'actions/stale@v11.0.0', if: null, continueOnError: false }])
  })

  // YAML mappings are unordered, so a job's own keys can follow `steps:` — and
  // one of them can be a block sequence, which sits at exactly the indent a step
  // item does. Without closing the steps block, `needs:` written that way adds a
  // step called `changes`.
  it('stops reading steps when the job\'s own keys resume below them', () => {
    const [parsed] = jobsIn('jobs:\n  build:\n    steps:\n      - name: One\n        run: x\n    needs:\n      - changes\n')

    expect(parsed.steps.map(step => step.name)).toEqual(['One'])
  })

  it('separates the jobs in one file', () => {
    const parsed = jobsIn('jobs:\n  one:\n    steps:\n      - name: A\n        run: x\n  two:\n    steps:\n      - name: B\n        run: y\n')

    expect(parsed.map(one => [one.id, one.steps.map(step => step.name)])).toEqual([['one', ['A']], ['two', ['B']]])
  })
})

describe('masksFailure', () => {
  it.each(['!cancelled()', 'always()', 'failure()', 'success()'].map(expr))('sees the status function in %s', (condition) => {
    expect(masksFailure({ name: 'x', uses: '', if: condition, continueOnError: false })).toBe(true)
  })

  it('sees continue-on-error, which masks the conclusion rather than the condition', () => {
    expect(masksFailure({ name: 'x', uses: '', if: null, continueOnError: true })).toBe(true)
  })

  // GitHub inserts `success() &&` in front of any condition that names no
  // status function, so such a step is as dependent on the steps above it as a
  // bare one. Counting it as masking would open the region at
  // `test-examples.yml`'s first `env.RUN` step and make every step below a
  // boundary.
  it('does not see a plain condition, which still carries the implicit success()', () => {
    expect(masksFailure({ name: 'x', uses: '', if: 'env.RUN == \'true\'', continueOnError: false })).toBe(false)
  })
})

describe('statesDependency', () => {
  it('sees a named outcome', () => {
    expect(statesDependency({ name: 'x', uses: '', if: expr('steps.npm-verified.outcome == \'success\''), continueOnError: false })).toBe(true)
  })

  // `steps.<id>.outputs.*` is a value the step produced, not whether it
  // succeeded — `test-examples.yml` gates on a cache hit that way, and a step
  // reading one says nothing about what failed above it.
  it('does not mistake an output for an outcome', () => {
    expect(statesDependency({ name: 'x', uses: '', if: 'steps.playwright-cache.outputs.cache-hit != \'true\'', continueOnError: false })).toBe(false)
  })

  it('does not count continue-on-error, which states nothing about what came before', () => {
    expect(statesDependency({ name: 'x', uses: '', if: null, continueOnError: true })).toBe(false)
  })
})

describe('boundariesIn', () => {
  const bare = (name: string): string => `      - name: ${name}\n        run: echo hi\n`
  const guarded = (name: string): string => `      - name: ${name}\n        if: \${{ !cancelled() }}\n        run: echo hi\n`
  const nonFatal = (name: string): string => `      - name: ${name}\n        continue-on-error: true\n        run: echo hi\n`

  it('finds nothing in a job where no step masks a failure', () => {
    expect(boundariesIn('a.yml', jobsIn(job(bare('One') + bare('Two')))[0])).toEqual([])
  })

  // Above the first masked step a bare step means exactly what it looks like,
  // so the rule has nothing to say about it. Reporting those would put every
  // unconditional step in every workflow into the record.
  it('says nothing about the steps above the first masked one', () => {
    const [parsed] = jobsIn(job(bare('Install') + guarded('Check') + bare('Build')))

    expect(boundariesIn('a.yml', parsed).map(one => one.key)).toEqual([
      'a.yml / build / Check',
      'a.yml / build / Build',
    ])
  })

  // The whole reason the record is one entry per file rather than eight: twelve
  // steps under one gate are one intent, and naming each of them would make the
  // classification the bulk of the config.
  it('names the first step of a run, not every step in it', () => {
    const [parsed] = jobsIn(job(guarded('First') + guarded('Second') + guarded('Third')))

    expect(boundariesIn('a.yml', parsed).map(one => one.key)).toEqual(['a.yml / build / First'])
  })

  it('records which way each boundary goes', () => {
    const [parsed] = jobsIn(job(guarded('Check') + bare('Build') + guarded('Report')))

    expect(boundariesIn('a.yml', parsed)).toEqual([
      { key: 'a.yml / build / Check', states: true },
      { key: 'a.yml / build / Build', states: false },
      { key: 'a.yml / build / Report', states: true },
    ])
  })

  // `release.yml`'s `Draft the GitHub release` is this shape: it takes the
  // implicit `success()` itself, and its `continue-on-error` is about the
  // publish below it.
  it('opens the region at a continue-on-error step that states nothing itself', () => {
    const [parsed] = jobsIn(job(`${bare('Install')}${nonFatal('Draft')}${bare('Publish')}`))

    expect(boundariesIn('a.yml', parsed)).toEqual([{ key: 'a.yml / build / Draft', states: false }])
  })
})

describe('gateProblems', () => {
  const runs = { 'a.yml / build / Check': 'runs after a failure on purpose' }
  const needs = { 'a.yml / build / Build': 'wants the implicit success()' }
  const classified = [{ key: 'a.yml / build / Check', states: true }, { key: 'a.yml / build / Build', states: false }]

  it('is silent when every boundary is classified the way it is written', () => {
    expect(gateProblems(classified, runs, needs)).toEqual([])
  })

  // The case this exists for: a step added below a masked one inherits a
  // success that did not happen, and nothing said so.
  it('names an unclassified boundary that inherits success()', () => {
    const found = [...classified, { key: 'a.yml / build / New', states: false }]

    expect(gateProblems(found, runs, needs)).toEqual([
      expect.stringContaining('a.yml / build / New inherits `success()`'),
    ])
  })

  it('names an unclassified boundary that gives up the guarantee', () => {
    const found = [...classified, { key: 'a.yml / build / New', states: true }]

    expect(gateProblems(found, runs, needs)).toEqual([
      expect.stringContaining('add it to RUNS_PAST_FAILURE'),
    ])
  })

  // The half one list cannot do. Under a single "classified, with a reason"
  // record, a step growing a `!cancelled()` it never had reads as classified.
  it('names a boundary that has crossed from one record to the other', () => {
    const found = [{ key: 'a.yml / build / Check', states: true }, { key: 'a.yml / build / Build', states: true }]

    expect(gateProblems(found, runs, needs)).toEqual([
      expect.stringContaining('is in NEEDS_EVERYTHING_ABOVE but now names a status function'),
    ])
  })

  it('names a boundary that has crossed back the other way', () => {
    const found = [{ key: 'a.yml / build / Check', states: false }, { key: 'a.yml / build / Build', states: false }]

    expect(gateProblems(found, runs, needs)).toEqual([
      expect.stringContaining('is in RUNS_PAST_FAILURE but no longer names a status function'),
    ])
  })

  it('refuses a boundary filed under both, which are opposites', () => {
    const both = { 'a.yml / build / Check': 'a reason' }

    expect(gateProblems([{ key: 'a.yml / build / Check', states: true }], both, both)).toEqual([
      expect.stringContaining('is in both records'),
    ])
  })

  it('requires a reason rather than an empty one', () => {
    expect(gateProblems([{ key: 'a.yml / build / Check', states: true }], { 'a.yml / build / Check': '' }, {})).toEqual([
      expect.stringContaining('RUNS_PAST_FAILURE names a.yml / build / Check with no reason'),
    ])
  })

  // This is the reach assertion, and it is why "found no boundary" is not a
  // floor: a parse that stops recognising `if:` or `continue-on-error` empties
  // the boundary list, and seven entries recorded by name fail here.
  it('names an entry whose boundary is no longer in the workflows', () => {
    expect(gateProblems([], runs, needs)).toEqual([
      expect.stringContaining('RUNS_PAST_FAILURE names a.yml / build / Check, which is not a boundary'),
      expect.stringContaining('NEEDS_EVERYTHING_ABOVE names a.yml / build / Build, which is not a boundary'),
    ])
  })
})

describe('walkProblems', () => {
  it('is silent over a walk that read something', () => {
    expect(walkProblems({ workflows: ['test.yml'], jobs: 1, steps: 4 })).toEqual([])
  })

  it('fails when the directory it reads has moved', () => {
    expect(walkProblems({ workflows: [], jobs: 0, steps: 0 })).toEqual([
      expect.stringContaining('held no workflow file'),
    ])
  })

  it('fails when it read the files and got no step out of them', () => {
    expect(walkProblems({ workflows: ['test.yml'], jobs: 0, steps: 0 })).toEqual([
      expect.stringContaining('parsed no step out of any of them'),
    ])
  })
})

describe('collect', () => {
  it('reads the workflow directory of the root it is pointed at', () => {
    const root = tree({ '.github/workflows/a.yml': job('      - name: One\n        run: echo hi\n'), '.github/workflows/notes.md': '' })

    expect(collect(root).walk).toEqual({ workflows: ['a.yml'], jobs: 1, steps: 1 })
  })
})

describe('checkStepGates', () => {
  /**
   * A copy of the real `.github/workflows/`, with one file rewritten.
   *
   * The two records travel with the check rather than with the tree, so an
   * invented workflow would make all seven entries stale and the check would
   * report that instead — which would let these pass without the injected fault
   * being noticed at all.
   */
  function workflowsWith(file: string, edit: (source: string) => string): string {
    const root = tree({ 'keep.txt': '' })
    cpSync(WORKFLOWS, join(root, '.github', 'workflows'), { recursive: true })
    const path = join(root, '.github', 'workflows', file)
    writeFileSync(path, edit(readFileSync(path, 'utf8')))
    return root
  }

  it('finds nothing over a copy with nothing injected', () => {
    assertNoProblems(checkStepGates(workflowsWith('test.yml', source => source)))
  })

  // #722's fourth attempt, as a diff: a sweep step placed after the publish
  // with no condition, inheriting a success the publish did not have.
  it('reports a step added below a masked one with nothing said', () => {
    const root = workflowsWith('release.yml', source => `${source}\n      - name: Sweep the labels\n        run: gh issue list\n`)

    expect(checkStepGates(root).problems).toContainEqual(expect.stringContaining('release.yml / release / Sweep the labels inherits `success()`'))
  })

  // On the step that opens the region, because that is where one edit is enough:
  // it is the first masked step either way, so it stays a boundary and changes
  // sides. Anywhere else, a step growing a condition joins the run above it and
  // stops being a boundary at all, which the stale-entry problem reports instead.
  it('reports the step that opens a region crossing to the other record', () => {
    const root = workflowsWith('release.yml', source =>
      source.replace('      - name: Draft the GitHub release\n', `      - name: Draft the GitHub release\n        if: ${expr('!cancelled()')}\n`))

    expect(checkStepGates(root).problems).toContainEqual(expect.stringContaining('release.yml / release / Draft the GitHub release is in NEEDS_EVERYTHING_ABOVE'))
  })

  it('reports a recorded boundary renamed out from under its reason', () => {
    const root = workflowsWith('release.yml', source => source.replace('- name: Verify every package reached npm', '- name: Check npm'))

    expect(checkStepGates(root).problems).toContainEqual(expect.stringContaining('RUNS_PAST_FAILURE names release.yml / release / Verify every package reached npm'))
  })

  it('every workflow step\'s position means what it looks like', { tags: ['check', 'ci'] }, () => {
    assertNoProblems(checkStepGates())
  })
})
