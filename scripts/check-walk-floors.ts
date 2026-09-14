// Holds every check to the question #719 asked: can it report success over an
// assertion that never ran?
//
// The sweep answered that check by check, and the answer is only worth what it
// costs to keep. A classification written once in a PR body is a fact about the
// afternoon it was written; the next check added to `scripts/` inherits none of
// it. So the classification lives here, and a check that is neither guarded nor
// explained fails this.
//
// "Guarded" means the check exports a `walkProblems`, or reads one from the
// check whose walk it shares — `check-published` has no walk of its own and
// takes `check-publishable`'s.
//
// The exemptions are the interesting half. Each says why the question does not
// apply, and each goes stale in a way this notices: name a check that no longer
// exists, or one that has since grown a floor, and it fails rather than ageing
// quietly.
//
// What it does *not* do, and `EXEMPT` and `ALLOWED` do: check the premise of
// each reason. Those two verify the negation of their own — a package that
// gains a `test` script, a workflow that stops pinning a version — because
// their reasons are uniform. These are not. `check-recipes` is exempt because
// it reports a missing section per recipe; delete those guards and this still
// reports it as classified. The entries are held to being current, not to being
// true, which is why each one names the thing to go and look at.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { rootFromArgv } from './check-publishable.ts'

const ROOT = join(import.meta.dirname, '..')

/**
 * Checks with no floor, and why the question does not apply to them.
 *
 * A reason is required. An exemption whose argument nobody wrote is
 * indistinguishable from a list somebody found inconvenient.
 */
export const WITHOUT_FLOOR: Record<string, string> = {
  'check-changelog.ts': 'not a check but a release tool — it prints a section, and it already exits 1 when the version it was asked for is not in the file',
  'check-recipes.ts': 'guarded per recipe: a missing section and a block count that does not match the files are both reported by name, so a parse that yields nothing fails once per recipe rather than passing',
  'check-local-tags.ts': 'warns and never fails, deliberately (#457), so its exit code carries no verdict for a floor to protect — and a repository with no tags at all is a normal state, not a walk that stopped reaching them',
  'check-config-reference.ts': 'throws when it cannot find `export interface PovesteConfig`, which is the same assertion a floor would make and louder',
  'check-example-wiring.ts': 'three guards already: no `example:` matrix, the guide missing, and no example table in it',
  'check-docs-site.ts': 'separates a missing build from a built one by name, and asserts specific paths are present, so an empty build fails before anything counts',
  'check-bundle-size.ts': 'separates "could not read the directory" from "no book in it" deliberately, and exits 1 for both',
  'check-conformance-config.ts': 'guards an empty spec list in `specProblems`, asserted in its spec — the empty defaults list and the empty book list are guarded in `main()`, so nothing reaches them yet (#719)',
  'check-doc-coverage.ts': 'reports an unbuilt tree by name, because a partial run over resolving shims is the failure it exists to catch',
  'check-package-tests.ts': 'has no walk of its own, and `EXEMPT` naming a package the list no longer carries fails it',
  'check-preview-position.ts': 'guards an empty file list and an empty group list in its own predicates',
  'check-task-graph.ts': 'guards an empty `tasks:` block and an empty pipeline, which is every way its two inputs can go empty',
  'check-starters.ts': 'reads an imported map rather than walking, and fails when that map is empty',
  'check-walk-floors.ts': 'this file — it walks `scripts/` and fails below when that walk finds nothing',
}

/** Check scripts on disk, by filename. */
export function checkScripts(dir: string): string[] {
  return readdirSync(dir)
    .filter(name => name.startsWith('check-') && name.endsWith('.ts') && !name.endsWith('.spec.ts'))
    .sort()
}

/**
 * Whether a check declares a floor of its own.
 *
 * Declarations only. The first version matched the word anywhere, and so
 * matched the message below telling an author to add one, which made this file
 * report itself as guarded. A check that detects a thing by mentioning it is
 * the joke this whole issue is about.
 *
 * `async` and a `const` arrow both count: `collect` is already async in
 * `check-versions`, so a floor that has to `stat` its inputs is a matter of
 * time, and reporting one as missing would push its author toward an exemption
 * for a check that has one.
 */
export function exportsFloor(source: string): boolean {
  return /^export (?:async )?function walkProblems\b/m.test(source)
    || /^export const walkProblems\b/m.test(source)
}

/** Whether a check reads the floor of the walk it shares with another check. */
export function importsFloor(source: string): boolean {
  return /^import \{[^}]*\bwalkProblems\b[^}]*\} from '\.\/check-[\w-]+\.ts'$/m.test(source)
}

/** Whether a check asserts that its own inputs were reached, either way. */
export function hasFloor(source: string): boolean {
  return exportsFloor(source) || importsFloor(source)
}

/**
 * Whether a spec that imports this check also exercises its floor.
 *
 * Declaring a floor is not having one: `export function walkProblems() { return
 * [] }` satisfies every pattern above, can never produce a problem, and is the
 * shortest way past this check for anyone who reads its failure as an obstacle.
 *
 * Nothing static proves a function is able to fail, and this does not claim to.
 * It raises the bar from *declared* to *reached by a spec*, which is where an
 * empty floor stops being invisible and starts being something a reviewer is
 * looking at. A stub with a spec that merely names it still passes — that is
 * the residual, and it is a question for review rather than for a regex.
 *
 * Only owners are asked. A check that imports another's floor is covered by
 * that check's spec, and asking twice would put the same fact in two places.
 */
export function floorIsExercised(check: string, specs: Record<string, string>): boolean {
  const importsCheck = new RegExp(`from '\\./${check.replace(/\.ts$/, '')}\\.ts'`)
  return Object.values(specs).some(spec => importsCheck.test(spec) && /\bwalkProblems\b/.test(spec))
}

export function floorProblems(checks: string[], sources: Record<string, string>, exempt: Record<string, string>, specs: Record<string, string> = {}): string[] {
  const problems: string[] = []

  if (checks.length === 0) {
    return ['scripts/ held no check to classify — this check is reading a directory that has moved']
  }

  for (const check of checks) {
    const source = sources[check] ?? ''
    const guarded = hasFloor(source)
    const reason = exempt[check]

    if (!guarded && !reason) {
      problems.push(`${check} neither asserts that it reached its inputs nor says why it does not have to — add a \`walkProblems\`, or an entry to WITHOUT_FLOOR with the reason`)
    }
    if (guarded && reason) {
      problems.push(`${check} has a floor now, so its WITHOUT_FLOOR entry is stale — delete it`)
    }
    if (exportsFloor(source) && !floorIsExercised(check, specs)) {
      problems.push(`${check} exports a \`walkProblems\` that no spec reaches — a floor nothing exercises is a declaration, and an empty one would pass every other assertion here`)
    }
  }

  for (const name of Object.keys(exempt)) {
    if (!checks.includes(name)) {
      problems.push(`WITHOUT_FLOOR names ${name}, which is not a check in scripts/ — delete the entry`)
    }
    if (!exempt[name]) {
      problems.push(`WITHOUT_FLOOR names ${name} with no reason`)
    }
  }

  return problems
}

function main(): void {
  // `--root` for the same reason `check-publishable` has one: a spec can assert
  // what `floorProblems` returns without it, but not what this process does
  // with the answer — and "reports success over an assertion that never ran" is
  // a statement about the exit code. Deleting the `process.exit` below left all
  // twelve specs green, which is this file's own defect committed inside it.
  const scripts = join(rootFromArgv(process.argv) ?? ROOT, 'scripts')

  const checks = checkScripts(scripts)
  const sources = Object.fromEntries(checks.map(name => [name, readFileSync(join(scripts, name), 'utf8')]))
  const specs = Object.fromEntries(
    readdirSync(scripts)
      .filter(name => name.endsWith('.spec.ts'))
      .map(name => [name, readFileSync(join(scripts, name), 'utf8')]),
  )
  const problems = floorProblems(checks, sources, WITHOUT_FLOOR, specs)

  if (problems.length > 0) {
    console.error('❌ A check could report success over an assertion that never ran:\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nEvery check either asserts it reached its inputs or says why it cannot (#719).')
    process.exit(1)
  }

  // Counted, not derived. `checks.length - exempt.length` is right only while
  // the two failures above keep the sets disjoint, and it would go on looking
  // right if either were relaxed.
  const guarded = checks.filter(name => hasFloor(sources[name] ?? '')).length
  const explained = checks.filter(name => name in WITHOUT_FLOOR).length
  console.log(`✅ ${checks.length} checks classified: ${guarded} assert they reached their inputs, ${explained} say why they do not have to`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
