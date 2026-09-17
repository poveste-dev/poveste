// Holds every package's tsconfig to the shared base (#782).
//
// Before #816 each package kept its own copy of the compiler options, and the
// copies drifted until the workspace was not checked at one level: `strict` in
// one package, `noImplicitAny` switched off in all of them. A flag turned off in
// one package still passes that package's typecheck, so nothing else notices.
//
// A package may relax a strictness flag, but only with a reason: an issue number
// in a comment on the line or directly above it.

import type { CheckResult } from './support/check-result.ts'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

export const BASE = 'tsconfig.base.json'

/** The settings a package could loosen. Anything else a package owns outright. */
export const STRICTNESS_FLAGS = [
  'strict',
  'noImplicitAny',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictBindCallApply',
  'strictPropertyInitialization',
  'strictBuiltinIteratorReturn',
  'noImplicitThis',
  'useUnknownInCatchVariables',
  'alwaysStrict',
  'noImplicitOverride',
  'noImplicitReturns',
  'noFallthroughCasesInSwitch',
  'noPropertyAccessFromIndexSignature',
  'noUncheckedIndexedAccess',
  'noUncheckedSideEffectImports',
  'exactOptionalPropertyTypes',
  'verbatimModuleSyntax',
  'isolatedModules',
]

const MAX_EXTENDS_DEPTH = 8

/** Every tsconfig directly inside a package, as repository-relative paths. */
export function packageTsconfigs(root = ROOT): string[] {
  const packages = join(root, 'packages')
  if (!existsSync(packages)) {
    return []
  }
  return readdirSync(packages, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => readdirSync(join(packages, entry.name))
      .filter(file => /^tsconfig(?:\.[\w-]+)?\.json$/.test(file))
      .map(file => `packages/${entry.name}/${file}`))
    .sort()
}

/** JSON with comments and trailing commas, which is what a tsconfig is. */
function parseJsonc(text: string): { extends?: unknown, compilerOptions?: Record<string, unknown> } {
  const withoutComments = text.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (match, string) => string ?? '')
  return JSON.parse(withoutComments.replace(/,(\s*[}\]])/g, '$1'))
}

/** Whether `file`, through its `extends` chain, reaches the root base. */
export function reachesBase(file: string, root = ROOT): boolean {
  const base = resolve(root, BASE)
  let current = resolve(root, file)
  for (let depth = 0; depth < MAX_EXTENDS_DEPTH; depth++) {
    const parent = parseJsonc(readFileSync(current, 'utf8')).extends
    if (typeof parent !== 'string' || !parent.startsWith('.')) {
      return false
    }
    current = resolve(dirname(current), parent.endsWith('.json') ? parent : `${parent}.json`)
    if (current === base) {
      return true
    }
    if (!existsSync(current)) {
      return false
    }
  }
  return false
}

/** Strictness flags set to `false` with no issue number on the line or directly above it. */
export function unexplainedRelaxations(text: string): string[] {
  const lines = text.split('\n')
  return STRICTNESS_FLAGS.filter((flag) => {
    const index = lines.findIndex(line => new RegExp(`"${flag}"\\s*:\\s*false`).test(line))
    if (index === -1) {
      return false
    }
    const explained = /#\d+/.test(lines[index]!) || /^\s*\/\/.*#\d+/.test(lines[index - 1] ?? '')
    return !explained
  })
}

export function tsconfigProblems(file: string, root = ROOT): string[] {
  const problems: string[] = []
  if (!reachesBase(file, root)) {
    problems.push(`${file} does not extend ${BASE}, so it checks at whatever level its own copy says`)
  }
  for (const flag of unexplainedRelaxations(readFileSync(join(root, file), 'utf8'))) {
    problems.push(`${file} sets \`${flag}\` to false with no issue number saying why`)
  }
  return problems
}

const REMEDY = `Extend ${BASE} (directly, or through the package's own tsconfig.json), and keep strictness flags on. A flag a package has to relax takes a comment with the issue that tracks it, on the line or directly above.`

export function checkTsconfigBase(root = ROOT): CheckResult {
  const files = packageTsconfigs(root)
  if (files.length === 0) {
    return { problems: [`no package tsconfig under ${relative(process.cwd(), join(root, 'packages')) || 'packages'}, so nothing was held to the base`], remedy: REMEDY, notes: [] }
  }
  if (!existsSync(join(root, BASE))) {
    return { problems: [`${BASE} is missing, and ${files.length} package tsconfigs are meant to extend it`], remedy: REMEDY, notes: [] }
  }
  return {
    problems: files.flatMap(file => tsconfigProblems(file, root)),
    remedy: REMEDY,
    notes: [`${files.length} package tsconfigs held to ${BASE}`],
  }
}
