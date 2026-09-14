// Holds the task graph in `pnpm-workspace.yaml` to the scripts it mirrors.
//
// #716 step one declares the pre-build checks as pnpm tasks so that one run
// reports every failure instead of stopping at the first. That puts the same
// list in two places — `pipelines.checks` and the `&&` chain in `release:check`
// — and nothing would notice them drifting apart. A report that quietly covers
// eleven of thirteen checks still prints a tidy summary, which is the failure
// this file exists to prevent. `check-example-wiring.ts` is the same idea for
// the example lists, and #706 is what that drift costs when nobody compares.
//
// The invocation is checked too, and that is not pedantry. `pnpm pipeline`
// leaves the workspace root out by default, and every one of these scripts is a
// root script — so without `--include-workspace-root` the run skips all of them
// and exits 0. Measured before this landed: 100 tasks, 0 passed, 0 failed, 100
// skipped, exit 0, with two real failures sitting in the tree. A green run that
// checked nothing is worse than no report at all.
//
// `--full` is checked for a third version of the same problem. pnpm selects the
// projects changed since the base by default; it warns and expands when a
// root file changes, but a warning is not a guarantee, and a run that quietly
// covers a subset is the same trap in slower motion.
//
// `--no-cache` is checked for the same reason from the other side: task result
// caching is step two of #716 and lands behind a measurement, because a wrong
// cache key restores a stale result and that also looks green.
//
// Only the steps before `build` are required to be in the pipeline. The ones
// after it need a built tree, which would put this report on the critical path
// — step one is additive on purpose.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '..')
const WORKSPACE = 'pnpm-workspace.yaml'
const PIPELINE = 'checks'
const REPORT_SCRIPT = 'release:report'

/**
 * Pre-build steps deliberately left out of the pipeline, and why.
 *
 * Keyed by step so that removing the reason without removing the exclusion
 * fails rather than passing quietly.
 */
export const EXCLUDED: Record<string, string> = {}

/** Task names declared under `tasks:`. */
export function declaredTasks(workspace: string): string[] {
  const block = /^tasks:\n((?:[ \t].*\n|\n)*)/m.exec(workspace)?.[1] ?? ''
  // Task names contain colons (`test:tags`), so the name runs to the *last* colon.
  return [...block.matchAll(/^ {2}(\S.*?):\s*$/gm)].map(match => match[1])
}

/** The names listed in one `pipelines:` entry. */
export function pipelineSteps(workspace: string, name: string): string[] {
  const line = new RegExp(`^ {2}${name}:\\s*\\[(.+)\\]\\s*$`, 'm').exec(workspace)?.[1]
  return line ? line.split(',').map(step => step.trim()).filter(Boolean) : []
}

/** The `pnpm run x && pnpm run y` chain, as step names. */
export function chainSteps(script: string): string[] {
  return script.split('&&').map(step => step.trim().replace(/^pnpm run /, '')).filter(Boolean)
}

/** Everything before `build`, which is where a built tree stops being optional. */
export function beforeBuild(steps: string[]): string[] {
  const build = steps.indexOf('build')
  return build === -1 ? steps : steps.slice(0, build)
}

/**
 * Everything after `build`, which is where the pre-build report must not reach.
 *
 * A step that needs a built tree cannot be in a pipeline that runs before one.
 * `lint` moved across that line when `ts/no-deprecated` turned out to be blind
 * to cross-package deprecations on a cold tree (#546), and nothing here would
 * have noticed it staying in the report: the run would lint an unbuilt
 * workspace and pass, which is the same green-over-nothing this file exists for.
 */
export function afterBuild(steps: string[]): string[] {
  const build = steps.indexOf('build')
  return build === -1 ? [] : steps.slice(build + 1)
}

export function taskGraphProblems(
  workspace: string,
  scripts: Record<string, string>,
  excluded: Record<string, string>,
): string[] {
  const problems: string[] = []
  const tasks = declaredTasks(workspace)
  const pipeline = pipelineSteps(workspace, PIPELINE)
  const chain = chainSteps(scripts['release:check'] ?? '')
  const required = beforeBuild(chain)

  if (tasks.length === 0) problems.push(`${WORKSPACE} declares no \`tasks:\` — the graph is gone, and so is the report`)
  if (pipeline.length === 0) problems.push(`${WORKSPACE} declares no \`pipelines.${PIPELINE}\` — nothing would run`)

  for (const step of required) {
    if (pipeline.includes(step) || step in excluded) continue
    problems.push(`\`release:check\` runs ${step} before the build, but \`pipelines.${PIPELINE}\` does not — the report would pass while the gate fails`)
  }

  const built = afterBuild(chain)

  for (const step of pipeline) {
    if (built.includes(step)) problems.push(`\`pipelines.${PIPELINE}\` names ${step}, which \`release:check\` runs after the build — the report would run it against an unbuilt tree and pass`)
    if (!tasks.includes(step)) problems.push(`\`pipelines.${PIPELINE}\` names ${step}, which has no entry under \`tasks:\``)
    if (!(step in scripts)) problems.push(`\`pipelines.${PIPELINE}\` names ${step}, which is not a root script — pnpm would skip it and still exit 0`)
  }

  for (const task of tasks) {
    if (!(task in scripts)) problems.push(`\`tasks:\` declares ${task}, which is not a root script — it would skip in every project`)
  }

  for (const step of Object.keys(excluded)) {
    if (!required.includes(step)) problems.push(`EXCLUDED names ${step}, which \`release:check\` no longer runs before the build — delete the entry`)
    if (pipeline.includes(step)) problems.push(`EXCLUDED names ${step}, which is in the pipeline anyway — one of the two is wrong`)
  }

  const report = scripts[REPORT_SCRIPT] ?? ''
  if (!report) {
    problems.push(`there is no \`${REPORT_SCRIPT}\` script, so the graph is declared and never run`)
  }
  else {
    if (!report.includes('--include-workspace-root')) {
      problems.push(`\`${REPORT_SCRIPT}\` omits \`--include-workspace-root\`: every one of these is a root script, and pnpm leaves the root out by default — the run skips all of them and exits 0`)
    }
    if (!report.includes('--full')) {
      problems.push(`\`${REPORT_SCRIPT}\` omits \`--full\`: pnpm would select only the projects changed since the base, so the report would quietly cover a subset and still pass`)
    }
    if (!report.includes('--no-cache')) {
      problems.push(`\`${REPORT_SCRIPT}\` omits \`--no-cache\`: task result caching is step two of #716 and needs a measurement first`)
    }
  }

  return problems
}

function main(): void {
  const workspace = readFileSync(join(ROOT, WORKSPACE), 'utf8')
  const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const problems = taskGraphProblems(workspace, scripts, EXCLUDED)

  if (problems.length > 0) {
    console.error('❌ The task graph and the scripts it mirrors disagree:\n')
    for (const problem of problems) console.error(`  • ${problem}`)
    console.error(`\nThe \`&&\` chain decides; \`${REPORT_SCRIPT}\` only reports. A report covering less than the gate is the failure worth catching (#716).`)
    process.exit(1)
  }

  const covered = pipelineSteps(workspace, PIPELINE).length
  console.log(`✅ ${covered} pre-build checks declared as tasks and named in \`pipelines.${PIPELINE}\`, matching \`release:check\``)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
