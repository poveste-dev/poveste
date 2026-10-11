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
// The record is `entry-exports.json`, one sorted list per entrypoint. Changing
// it is the deliberate step: the diff of that file in a PR is the list of what
// the PR makes public or takes away.
//
// Needs a build, like `doc-coverage.ts`: it reads `dist`.

import type { CheckResult } from './support/check-result.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

function exportedNames(types: string): string[] | null {
  const program = ts.createProgram([types], COMPILER_OPTIONS)
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(types)
  const symbol = source && checker.getSymbolAtLocation(source)
  if (!symbol) return null
  return checker.getExportsOfModule(symbol).map(exported => exported.getName()).sort()
}

/** What each published entrypoint exports in the built tree. */
export function builtSurface(root = ROOT): { surface: Surface, unbuilt: string[] } {
  const surface: Surface = {}
  const unbuilt: string[] = []

  for (const { name, dir } of publishablePackages(root)) {
    if (name in NOT_OURS) continue
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    for (const entry of entrypointsOf(name, dir, manifest)) {
      const names = entry.resolved ? exportedNames(entry.types) : null
      if (names?.length) surface[entry.specifier] = names
      else unbuilt.push(entry.specifier)
    }
  }

  return { surface, unbuilt }
}

export function surfaceProblems(built: Surface, recorded: Surface): string[] {
  const problems: string[] = []

  for (const [specifier, names] of Object.entries(built)) {
    const known = recorded[specifier]
    if (!known) {
      problems.push(`${specifier} is a published entrypoint with no list in ${RECORD}`)
      continue
    }
    for (const name of names.filter(name => !known.includes(name))) {
      problems.push(`${specifier} exports \`${name}\`, which is not recorded`)
    }
    for (const name of known.filter(name => !names.includes(name))) {
      problems.push(`${specifier} no longer exports \`${name}\`, which is recorded`)
    }
  }

  for (const specifier of Object.keys(recorded).filter(specifier => !built[specifier])) {
    problems.push(`${RECORD} lists ${specifier}, which is not an entrypoint of the built tree`)
  }

  return problems
}

const REMEDY = `An unrecorded export is public from the next release, and taking it back is a removal. If a spec needed it, import it from a module the entry does not re-export. If it is meant to be public, add it to ${RECORD} and say so in the PR. A name that is no longer exported is a breaking change for whoever imports it: restore it, or remove it from the record on purpose. An entrypoint missing from the built tree usually means \`pnpm run build\` has not run.`

export function checkEntryExports(root = ROOT): CheckResult {
  const { surface, unbuilt } = builtSurface(root)

  if (Object.keys(surface).length === 0) {
    return { problems: ['no entrypoint was compared, so nothing is known about the surface'], remedy: REMEDY, notes: [] }
  }

  const recorded = JSON.parse(readFileSync(join(root, RECORD), 'utf8')) as Surface
  const problems = [
    ...unbuilt.map(specifier => `${specifier} did not resolve to a module that exports anything`),
    ...surfaceProblems(surface, recorded),
  ]
  const total = Object.values(surface).reduce((sum, names) => sum + names.length, 0)

  return { problems, remedy: REMEDY, notes: [`${total} exported names across ${Object.keys(surface).length} entrypoints match ${RECORD}.`] }
}
