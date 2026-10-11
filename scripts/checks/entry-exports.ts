// Fails when a published entrypoint exports a name nobody recorded, or stops
// exporting one that is recorded.
//
// `processDefaultConfig` and `withoutIgnoredPlugins` each gained `export` so a
// spec could call them, and each package's entry then published them. A diff of
// the built entries against the last release found both, by hand, days before
// the cut (#1291). A name is free to add and a removal to take back, so the
// moment to notice is the PR that adds it.
//
// The compiler answers, as it does for `doc-coverage.ts`: the exports of each
// entrypoint's `.d.ts`, types included, with every `export *` followed. That is
// the surface a consumer's editor offers, and a type is as public as a function
// (#1255 was a type getting narrower).
//
// Three entrypoints declare no types: `@poveste/app`, an untyped bundle by
// decision (#362), and `@poveste/plugin-vue`'s two `-dev` entries, which point
// at source. Those are read from the file the entry names instead. The first
// version took its list from `entrypointsOf`, which returns typed entries only,
// so all three went uncompared and nothing said so. Every declared entrypoint
// is now either read or a failure.
//
// The record is `entry-exports.json`, one sorted list per entrypoint. Changing
// it is the deliberate step: the diff of that file in a PR is the list of what
// the PR makes public or takes away.
//
// Needs a build, like `doc-coverage.ts`: it reads `dist`.

import type { CheckResult } from './support/check-result.ts'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { COMPILER_OPTIONS, entrypointsOf } from './doc-coverage.ts'
import { publishablePackages } from './publishable.ts'

const ROOT = join(import.meta.dirname, '..', '..')

export const RECORD = 'scripts/checks/entry-exports.json'

export type Surface = Record<string, string[]>

/**
 * Packages whose entrypoints are another project's API, re-exported whole.
 *
 * `@poveste/vendors/vue` is every name `vue` exports, 361 of them, and
 * `@poveste/vendors/vue-use` is 799. Recording them would fail this check on a
 * dependency bump and say nothing about what Poveste chose to publish.
 */
export const NOT_OURS: Record<string, string> = {
  '@poveste/vendors': 're-exports vue, vue-router, pinia, @vueuse/core and @iconify/vue as they are',
}

function exportedNames(file: string): string[] | null {
  const program = ts.createProgram([file], { ...COMPILER_OPTIONS, allowJs: true })
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(file)
  const symbol = source && checker.getSymbolAtLocation(source)
  if (!symbol) return null
  return checker.getExportsOfModule(symbol).map(exported => exported.getName()).sort()
}

/** The file an export entry runs: its `default`, however the conditions nest, or the string itself. */
function scriptOf(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null
  const conditions = value as Record<string, unknown>
  if (typeof conditions['default'] === 'string') return conditions['default']
  for (const nested of Object.values(conditions)) {
    const found = scriptOf(nested)
    if (found) return found
  }
  return null
}

/**
 * Every entrypoint a manifest declares, typed or not, with the file each runs.
 *
 * Wildcard subpaths are skipped, as `entrypointsOf` skips them: `"./*"` makes
 * every file in the tarball importable, which is #203's question, not a surface.
 */
export function declaredEntrypoints(name: string, manifest: { exports?: unknown, main?: string }): Map<string, string | null> {
  const declared = new Map<string, string | null>()
  const exportsField = manifest.exports

  if (typeof exportsField === 'string') {
    declared.set(name, exportsField)
  }
  else if (exportsField && typeof exportsField === 'object') {
    for (const [sub, value] of Object.entries(exportsField as Record<string, unknown>)) {
      if (sub.includes('*')) continue
      declared.set(sub === '.' ? name : `${name}${sub.slice(1)}`, scriptOf(value))
    }
  }
  if (!declared.has(name) && manifest.main) declared.set(name, manifest.main)

  return declared
}

/** What each published entrypoint exports in the built tree, and the ones that could not be read. */
export function builtSurface(root = ROOT): { surface: Surface, unread: string[] } {
  const surface: Surface = {}
  const unread: string[] = []

  for (const { name, dir } of publishablePackages(root)) {
    if (name in NOT_OURS) continue
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const typed = new Map(entrypointsOf(name, dir, manifest).map(entry => [entry.specifier, entry.types]))
    const declared = declaredEntrypoints(name, manifest)
    // A root typed only through the manifest's `types` field is in neither map's keys yet.
    for (const specifier of typed.keys()) {
      if (!declared.has(specifier)) declared.set(specifier, null)
    }
    if (declared.size === 0) {
      unread.push(`${name} is published and declares no entrypoint`)
      continue
    }

    for (const [specifier, script] of declared) {
      const file = typed.get(specifier) ?? (script ? resolve(dir, script) : null)
      const names = file && existsSync(file) ? exportedNames(file) : null
      if (names?.length) surface[specifier] = names
      else unread.push(`${specifier} is a declared entrypoint and ${file ? `${file.slice(root.length + 1)} ${existsSync(file) ? 'exports nothing the compiler can see' : 'does not exist'}` : 'names no file'}`)
    }
  }

  return { surface, unread }
}

export function surfaceProblems(built: Surface, recorded: Surface): string[] {
  const problems: string[] = []

  for (const [specifier, names] of Object.entries(built)) {
    const known = recorded[specifier]
    if (!known) {
      problems.push(`${specifier} is a published entrypoint with no list in ${RECORD}`)
      continue
    }
    // Each says what to do: whoever meets one is usually on an unrelated PR.
    for (const name of names.filter(name => !known.includes(name))) {
      problems.push(`${specifier} exports \`${name}\`, which is not in ${RECORD}. If it is meant to be public, add it to that file under "${specifier}" and say so in the PR. If only a spec needs it, import it from a module the entrypoint does not re-export.`)
    }
    for (const name of known.filter(name => !names.includes(name))) {
      problems.push(`${specifier} no longer exports \`${name}\`, which ${RECORD} records. That is a removal a consumer can see: restore it, or deprecate it first as docs/guide/getting-started.md#deprecations promises and remove it in a release whose notes say so. Only then delete its line.`)
    }
  }

  for (const specifier of Object.keys(recorded).filter(specifier => !built[specifier])) {
    problems.push(`${RECORD} lists ${specifier}, which is not an entrypoint of the built tree`)
  }

  return problems
}

const REMEDY = `A name is public from the release after it appears, and taking it back is a removal, so ${RECORD} changes only on purpose. An entrypoint missing from the built tree usually means \`pnpm run build\` has not run.`

export function checkEntryExports(root = ROOT): CheckResult {
  const { surface, unread } = builtSurface(root)

  if (Object.keys(surface).length === 0) {
    return { problems: ['no entrypoint was compared, so nothing is known about the surface', ...unread], remedy: REMEDY, notes: [] }
  }

  const recorded = JSON.parse(readFileSync(join(root, RECORD), 'utf8')) as Surface
  const problems = [
    ...unread.map(entry => `${entry}, so it was not compared. Build it, or if it is another project's API re-exported whole, add its package to NOT_OURS in scripts/checks/entry-exports.ts with the reason.`),
    ...surfaceProblems(surface, recorded),
  ]
  const total = Object.values(surface).reduce((sum, names) => sum + names.length, 0)

  return { problems, remedy: REMEDY, notes: [`${total} exported names across ${Object.keys(surface).length} entrypoints match ${RECORD}.`] }
}
