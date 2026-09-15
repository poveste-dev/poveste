// Holds every workflow job to the rule that a step's *position* stops meaning
// anything once something above it has masked a failure.
//
// A step with no `if:` runs when every step before it succeeded. Two things
// break that silently. A status function — `success()`, `failure()`,
// `always()`, `cancelled()` — suppresses the implicit `success()` in full,
// including the dependency on the step immediately above. And
// `continue-on-error: true` makes a step's *conclusion* success whatever its
// outcome, so every later step inherits a success that did not happen.
//
// Either way, "place it after X" specifies nothing below the first such step.
// Specifying #722's label sweep cost four attempts on exactly that: after the
// publish (fires over a failed publish, which is deliberately non-fatal), then
// gated on the publish step (skips a good release whose notification blipped),
// before landing on the outcome the label actually depends on (#723).
//
// ## Boundaries, not steps
//
// Flagging every later step would make the record the bulk of the config —
// twelve entries in `test.yml` alone, all saying the same thing. What is worth
// naming is the step at which the intent *changes*: the first masked step, and
// then every point where the job switches between stating its dependency and
// inheriting `success()`. Seven of those across three workflows, out of the
// thirty-one steps that sit below a masked one.
//
// ## Two records, because the deliberate cases are opposites
//
// One `STABLE`-style list would file both under "classified, with a reason",
// and the next person adding a step would read it for a precedent and find two
// entries arguing opposite ways. So:
//
// - `RUNS_PAST_FAILURE` — states its dependency on purpose, because it has to
//   run after something above it failed.
// - `NEEDS_EVERYTHING_ABOVE` — states nothing on purpose, because the implicit
//   `success()` is exactly what it wants.
//
// A boundary that changes sides fails, which is the half a single list cannot
// do — give `release.yml`'s `Draft the GitHub release` a `!cancelled()` and it
// is still the step that opens the region, still classified, and now arguing
// the opposite case under a heading that says otherwise.
//
// Parsed by indentation rather than with a YAML dependency the repository root
// does not have — `check-example-wiring.ts` and `check-task-graph.ts` read
// these files the same way. Not grepped: the `run: |` blocks here are full of
// shell `if`, and `release.yml`'s is prose about this very rule, so a grep
// would answer about the comments as readily as about the config. A block
// scalar's body has to be indented past the key that opens it, which is what
// puts it out of reach of the two guards below.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const WORKFLOWS = '.github/workflows'

/**
 * Boundaries that state their dependency on purpose.
 *
 * Each of these has to run *after* something above it failed, so it names a
 * status function or an outcome and gives up the guarantee its position would
 * otherwise carry. The entry is the point at which that happens; the steps
 * following it under the same gate are covered by it.
 */
export const RUNS_PAST_FAILURE: Record<string, string> = {
  'test.yml / build-and-test / Check the version tables': 'opens the twelve build-free checks. One failing check must not skip the eleven after it, or a run that could name twelve problems costs twelve cycles to read (#720). Paired with the install rather than standing alone, because `!cancelled()` suppresses the dependency on the step above as well',
  'release.yml / release / Verify every package reached npm': 'the first of three registry and release checks that run even after one of them fails, so a single run names every problem — a partial publish and a missing GitHub release would otherwise take one re-run each (#327)',
  'release.yml / release / Verify the GitHub release was created': 'both release steps are deliberately non-fatal, so a GitHub API blip cannot block an otherwise good publish — but the run must not go green without the release that explains it. Last in the job, so it reports rather than gates (#186)',
  'test-examples.yml / test / Flag flaky tests': 'retries make a flake green, so this is the only thing that says one happened. It has to read a result the job has already decided was a pass, and the upload below it wants the traces on the same terms (#75)',
}

/**
 * Boundaries that state nothing on purpose.
 *
 * Each of these wants the implicit `success()` and would be wrong with
 * anything else — a status function here would run the step against a tree its
 * input never arrived in, and report that missing input on top of the failure
 * that is already the reason.
 */
export const NEEDS_EVERYTHING_ABOVE: Record<string, string> = {
  'test.yml / build-and-test / Build the docs site': 'where the guard above stops. This and everything after it depends on a build, and a status function would report each dependent step\'s own missing-input error on top of the failure that is already the reason (#721)',
  'release.yml / release / Draft the GitHub release': 'drafting must not happen over a failed preflight, so it takes the implicit `success()`; its own `continue-on-error` is about the publish below it, which must not be blocked by a GitHub API blip. `Publish to npm` sits under the same gate for the same reason',
  'release.yml / release / Publish the GitHub release': 'publishing the draft is what emails every watcher, so it waits until the packages the notes point at are on npm and installable — a failed registry check must not mail anyone (#399)',
}

export interface Step {
  name: string
  uses: string
  if: string | null
  continueOnError: boolean
}

export interface Job {
  id: string
  steps: Step[]
}

export interface Boundary {
  key: string
  /** Whether it names a status function or an outcome, rather than inheriting `success()`. */
  states: boolean
}

export interface Walk {
  workflows: string[]
  jobs: number
  steps: number
}

/**
 * The four functions that suppress the implicit `success()`.
 *
 * `github.event_name == 'push'` does not, and is deliberately not here: an
 * `if:` without a status function still has `success() &&` inserted in front of
 * it, so such a step is as dependent on the steps above as a bare one.
 */
export const STATUS_FUNCTION = /\b(?:success|failure|always|cancelled)\s*\(\s*\)/

/** A named dependency on another step, which is the other way to be explicit. */
export const OUTCOME = /\bsteps\.[\w-]+\.(?:outcome|conclusion)\b/

function indentOf(line: string): number {
  return line.length - line.trimStart().length
}

function readProperty(step: Step, text: string): void {
  // The first colon, and the value is whatever follows it. A step name can hold
  // a colon of its own — `Clear on:next from what this release shipped` does —
  // so the split is anchored at the key rather than at the value.
  const at = text.indexOf(':')
  if (at === -1) return

  const key = text.slice(0, at)
  const value = text.slice(at + 1).trim()
  if (!/^[\w-]+$/.test(key)) return

  if (key === 'name') step.name = value.replace(/^['"]|['"]$/g, '')
  else if (key === 'uses') step.uses = value
  else if (key === 'if') step.if = value
  else if (key === 'continue-on-error') step.continueOnError = value === 'true'
}

/** What a boundary is called, which is what the records are keyed on. */
export function label(step: Step, position: number): string {
  return step.name || step.uses || `step ${position + 1}`
}

/**
 * The jobs and their steps, by indentation.
 *
 * Indents are learnt from the file rather than assumed, and only two lines in a
 * job are read as a step's: one at the item indent, and one at the item's own
 * property indent. Everything deeper belongs to a `with:`, an `env:` or a `run:
 * |` body; everything shallower is the job's. That is the whole defence, and it
 * is enough because YAML gives a nested block no way to sit at either indent.
 *
 * A job-level `if:` is a different rule and is not this one:
 * `test-examples.yml`'s `test` job carries `!cancelled()` there, and that says
 * nothing about the steps inside it.
 */
export function jobsIn(source: string): Job[] {
  const lines = source.split('\n')
  const jobs: Job[] = []

  let jobsIndent = -1
  let jobIdIndent = -1
  let job: Job | undefined
  let stepsIndent = -1
  let itemIndent = -1
  let propIndent = -1
  let step: Step | undefined

  for (let i = 0; i < lines.length; i++) {
    const body = lines[i].trim()
    if (body === '' || body.startsWith('#')) continue

    const indent = indentOf(lines[i])

    if (jobsIndent === -1) {
      if (/^jobs:$/.test(body)) jobsIndent = indent
      continue
    }
    // A key back at the top level closes `jobs:`.
    if (indent <= jobsIndent) break

    if (jobIdIndent === -1) jobIdIndent = indent
    if (indent === jobIdIndent) {
      const id = /^([\w-]+):$/.exec(body)?.[1]
      job = id ? { id, steps: [] } : undefined
      if (job) jobs.push(job)
      stepsIndent = -1
      itemIndent = -1
      step = undefined
      continue
    }
    if (!job) {
      continue
    }

    if (stepsIndent !== -1 && indent <= stepsIndent) {
      stepsIndent = -1
      itemIndent = -1
      step = undefined
    }
    if (stepsIndent === -1) {
      if (/^steps:$/.test(body)) stepsIndent = indent
      continue
    }

    const item = /^-\s*/.exec(body)
    if (item && (itemIndent === -1 || indent === itemIndent)) {
      itemIndent = indent
      // Where the item's own keys sit, taken from the dash rather than assumed:
      // `- name:` puts them two across, `-   name:` four.
      propIndent = indent + item[0].length
      step = { name: '', uses: '', if: null, continueOnError: false }
      job.steps.push(step)
      readProperty(step, body.slice(item[0].length))
    }
    else if (step && indent === propIndent) {
      readProperty(step, body)
    }
  }

  return jobs
}

/** Whether this step costs every step below it the guarantee its position implies. */
export function masksFailure(step: Step): boolean {
  return step.continueOnError || (step.if !== null && STATUS_FUNCTION.test(step.if))
}

/** Whether this step says what it depends on, rather than inheriting it. */
export function statesDependency(step: Step): boolean {
  return step.if !== null && (STATUS_FUNCTION.test(step.if) || OUTCOME.test(step.if))
}

/**
 * The points in one job at which the intent changes.
 *
 * Nothing before the first masked step is a boundary: up there a bare step
 * means what it looks like, and the rule has nothing to say about it. From
 * there down, each run of steps under the same gate is named by its first.
 */
export function boundariesIn(file: string, job: Job): Boundary[] {
  const opens = job.steps.findIndex(masksFailure)
  if (opens === -1) return []

  const found: Boundary[] = []
  let previous: boolean | undefined

  for (let at = opens; at < job.steps.length; at++) {
    const states = statesDependency(job.steps[at])
    if (states === previous) continue
    previous = states
    found.push({ key: `${file} / ${job.id} / ${label(job.steps[at], at)}`, states })
  }

  return found
}

export function boundaries(workflows: { file: string, source: string }[]): Boundary[] {
  return workflows.flatMap(({ file, source }) =>
    jobsIn(source).flatMap(job => boundariesIn(file, job)))
}

export function collect(root = ROOT): { workflows: { file: string, source: string }[], walk: Walk } {
  const dir = join(root, WORKFLOWS)
  const names = readdirSync(dir).filter(name => /\.ya?ml$/.test(name)).sort()
  const workflows = names.map(file => ({ file, source: readFileSync(join(dir, file), 'utf8') }))
  const jobs = workflows.flatMap(({ source }) => jobsIn(source))

  return {
    workflows,
    walk: {
      workflows: names,
      jobs: jobs.length,
      steps: jobs.reduce((total, job) => total + job.steps.length, 0),
    },
  }
}

/**
 * The floor: it read some workflows, and got steps out of them.
 *
 * "Found no boundary" is deliberately not a floor, because a repository with no
 * masked step anywhere is a legitimate state. The reach assertion that matters
 * is in `gateProblems` instead, and it is stronger than a floor would be: seven
 * boundaries are recorded by name, so a parse that stops recognising `if:` or
 * `continue-on-error` turns all seven entries stale and fails there.
 */
export function walkProblems({ workflows, steps }: Walk): string[] {
  const problems: string[] = []
  if (workflows.length === 0) {
    problems.push(`${WORKFLOWS} held no workflow file — this check is reading a directory that has moved`)
  }
  else if (steps === 0) {
    problems.push(`read ${workflows.length} workflows and parsed no step out of any of them — the parse has stopped reaching the jobs`)
  }
  return problems
}

export function gateProblems(
  found: Boundary[],
  runsPastFailure: Record<string, string>,
  needsEverythingAbove: Record<string, string>,
): string[] {
  const problems: string[] = []

  for (const { key, states } of found) {
    const inRuns = key in runsPastFailure
    const inNeeds = key in needsEverythingAbove

    if (inRuns && inNeeds) {
      problems.push(`${key} is in both records — it either states its dependency or inherits \`success()\`, and the point of two lists is that those are opposites`)
      continue
    }
    if (!inRuns && !inNeeds) {
      problems.push(
        states
          ? `${key} names a status function or an outcome and nothing says why — add it to RUNS_PAST_FAILURE with the reason it has to run after a failure`
          : `${key} inherits \`success()\` from a point in the job where that no longer means what it looks like — add it to NEEDS_EVERYTHING_ABOVE with the reason, or give it an \`if:\` naming what it depends on`,
      )
      continue
    }
    if (states && inNeeds) {
      problems.push(`${key} is in NEEDS_EVERYTHING_ABOVE but now names a status function or an outcome — it states its dependency, so the entry belongs in RUNS_PAST_FAILURE`)
    }
    if (!states && inRuns) {
      problems.push(`${key} is in RUNS_PAST_FAILURE but no longer names a status function or an outcome — it inherits \`success()\` now, so the entry belongs in NEEDS_EVERYTHING_ABOVE`)
    }
    if (inRuns && !runsPastFailure[key]) problems.push(`RUNS_PAST_FAILURE names ${key} with no reason`)
    if (inNeeds && !needsEverythingAbove[key]) problems.push(`NEEDS_EVERYTHING_ABOVE names ${key} with no reason`)
  }

  const keys = new Set(found.map(boundary => boundary.key))
  for (const [record, entries] of [['RUNS_PAST_FAILURE', runsPastFailure], ['NEEDS_EVERYTHING_ABOVE', needsEverythingAbove]] as const) {
    for (const key of Object.keys(entries)) {
      if (!keys.has(key)) {
        problems.push(`${record} names ${key}, which is not a boundary in the workflows — the step has moved, been renamed, or stopped being one. Delete the entry`)
      }
    }
  }

  return problems
}

export function checkStepGates(root = ROOT): string[] {
  const { workflows, walk } = collect(root)
  return [...walkProblems(walk), ...gateProblems(boundaries(workflows), RUNS_PAST_FAILURE, NEEDS_EVERYTHING_ABOVE)]
}
