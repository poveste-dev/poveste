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
// quietly. That is the shape `EXEMPT`, `ALLOWED` and `AFTER_BUILD` already use.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '..')
const SCRIPTS = join(ROOT, 'scripts')

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
  'check-conformance-config.ts': 'guards an empty spec list, an empty defaults list and an empty book list in its own predicates',
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
 * Whether a check asserts that its own inputs were reached.
 *
 * Declarations only — an export of its own, or an import of another check's.
 * The first version of this matched the word anywhere, and so matched the
 * message four lines below telling an author to add one, which made this file
 * report itself as guarded. A check that detects a thing by mentioning it is
 * the joke this whole issue is about.
 */
export function hasFloor(source: string): boolean {
  return /^export function walkProblems\(/m.test(source)
    || /^import \{[^}]*\bwalkProblems\b[^}]*\} from '\.\/check-[\w-]+\.ts'$/m.test(source)
}

export function floorProblems(checks: string[], sources: Record<string, string>, exempt: Record<string, string>): string[] {
  const problems: string[] = []

  if (checks.length === 0) {
    return ['scripts/ held no check to classify — this check is reading a directory that has moved']
  }

  for (const check of checks) {
    const guarded = hasFloor(sources[check] ?? '')
    const reason = exempt[check]

    if (!guarded && !reason) {
      problems.push(`${check} neither asserts that it reached its inputs nor says why it does not have to — add a \`walkProblems\`, or an entry to WITHOUT_FLOOR with the reason`)
    }
    if (guarded && reason) {
      problems.push(`${check} has a floor now, so its WITHOUT_FLOOR entry is stale — delete it`)
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
  const checks = checkScripts(SCRIPTS)
  const sources = Object.fromEntries(checks.map(name => [name, readFileSync(join(SCRIPTS, name), 'utf8')]))
  const problems = floorProblems(checks, sources, WITHOUT_FLOOR)

  if (problems.length > 0) {
    console.error('❌ A check could report success over an assertion that never ran:\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nEvery check either asserts it reached its inputs or says why it cannot (#719).')
    process.exit(1)
  }

  const guarded = checks.length - Object.keys(WITHOUT_FLOOR).length
  console.log(`✅ ${checks.length} checks classified: ${guarded} assert they reached their inputs, ${Object.keys(WITHOUT_FLOOR).length} say why they do not have to`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
