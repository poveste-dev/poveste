// Reports how much of the published type surface carries a doc comment.
//
// #363 measured this by hand against 0.8.0 and the number went straight into a
// table nothing recomputes, which is the shape that is wrong within two
// releases — it already was: that pass counted 156 exported *declarations* in
// `poveste`'s `.d.ts` files, where the module surface a consumer actually sees
// is 92 symbols, and `@poveste/plugin-quasar` did not exist yet.
//
// So this asks the compiler instead of a regex. For every named entrypoint in
// every published package it resolves the `types` file, takes the exports of
// that module, and counts the ones `getDocumentationComment` answers for. That
// is the same question an editor asks when it renders a hover.
//
// **Report only, and deliberately.** There is no threshold and it cannot fail on
// a percentage: a gate here would be red on the day it landed and stay red,
// which teaches people to ignore the step rather than to write a sentence.
//
// What it does fail on is a measurement that did not happen, and that took three
// attempts to get right, because a partial measurement is a plausible number
// rather than an obvious absence.
//
//   1. "Nothing resolved" does not hold. Against an unbuilt tree the
//      hand-written shims still answer, so six of twenty entrypoints report and
//      the total reads **26%**, higher than the true 21%.
//   2. "The entrypoint file exists and exports something" does not hold either.
//      Remove one inner directory — `@poveste/shared`'s `dist/types/` — and
//      every entrypoint still resolves while `poveste` falls from 92 exports to
//      37 and the total from 263 to 153, exit 0. `@poveste/shared`'s own figure
//      *rises* from 25% to 33%, because only the undocumented symbols left.
//
// So the check is on the module graph, not the entry file: any **relative**
// import or export in the program that does not resolve means the tree is half
// built. Relative rather than every unresolved specifier, because this runs
// without each package's own tsconfig `paths` — a healthy tree has 18 bare ones
// (`vue`, `vue-router`, vendored) and zero relative ones. Measured both ways.
//
// A declared entrypoint whose `.d.ts` is missing, one that resolves to a module
// exporting nothing, and a run that measured no rows at all, all fail too.
//
// Needs a build: it reads `dist`, so it runs after Build rather than with the
// manifest checks at the front of `release:check`.
//
// The formatting is pure and exported; the compiler work and the exit live in
// `main()` behind the import guard, so a test importing this cannot reach
// `process.exit` (#388).

import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { publishablePackages } from './check-publishable.ts'

const ROOT = join(import.meta.dirname, '..')

/**
 * Entrypoints that declare a `.d.ts` the build does not emit.
 *
 * Keyed by specifier rather than by package, and each one is a claim about that
 * exact entrypoint. The first version reused `check-publishable.ts`'s
 * `BUNDLER_ONLY_PACKAGES`, which reads well — one list, one fix — and is wrong
 * here: that set also holds `@poveste/controls`, which *does* emit its
 * declarations. Hiding `packages/poveste-controls/dist/index.d.ts` exited 0,
 * dropped 18 symbols out of the denominator and moved the headline from 21% to
 * 22%, which is the failure named four lines further down.
 *
 * An entry goes stale the moment the file appears, so that fails too.
 */
export const UNRESOLVED: Record<string, string> = {
  '@poveste/app': 'declares `./dist/index.d.ts` and emits no declarations at all — its `types` field points at `./src/index.ts`. Predates #302 and is tracked as #312, which is also why `check-publishable.ts` holds its `attw` run back',
}

export interface Entrypoint {
  /** What a consumer writes, e.g. `poveste/client`. */
  specifier: string
  /** Absolute path to the `.d.ts` that entrypoint resolves to. */
  types: string
  /** False when the manifest declares this path and nothing is there — an unbuilt tree, not a package without types. */
  resolved: boolean
}

export interface Coverage {
  specifier: string
  total: number
  documented: number
  undocumented: string[]
}

/**
 * The `types` path of one export entry, however deeply the conditions nest.
 *
 * `{ types, default }` is the only shape in this repo today, but a package that
 * moved to `{ import: { types }, require: { types } }` would have no `types` at
 * the top and would fall through to the manifest's `types` field — which for
 * `@poveste/app` is `./src/index.ts`. Measuring source instead of the emitted
 * declarations is the quiet wrong answer this exists to avoid.
 *
 * A string entry (`".": "./dist/index.js"`) has no types condition and returns
 * null on purpose, so the manifest fallback still covers `@poveste/plugin-quasar`.
 */
export function typesConditionOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const conditions = value as Record<string, unknown>
  if (typeof conditions.types === 'string') return conditions.types
  for (const nested of Object.values(conditions)) {
    const found = typesConditionOf(nested)
    if (found) return found
  }
  return null
}

/**
 * The entrypoints of one package, as a consumer can import them.
 *
 * Wildcard subpaths are skipped rather than expanded. `poveste` maps `"./*"` to
 * `"./*"`, which makes every file in the tarball importable — that is worth a
 * decision (#203) but it is not a documentable surface, and treating it as one
 * would put the whole `dist` into this measurement.
 */
export function entrypointsOf(
  name: string,
  dir: string,
  manifest: { exports?: unknown, types?: string, typings?: string },
  exists: (path: string) => boolean = existsSync,
): Entrypoint[] {
  const found: Entrypoint[] = []
  const add = (sub: string, rel: string): void => {
    const abs = resolve(dir, rel)
    found.push({ specifier: sub === '.' ? name : `${name}${sub.slice(1)}`, types: abs, resolved: exists(abs) })
  }

  const exportsField = manifest.exports
  let exportsDeclaresRoot = false
  if (exportsField && typeof exportsField === 'object') {
    for (const [sub, value] of Object.entries(exportsField as Record<string, unknown>)) {
      if (sub.includes('*')) continue
      const types = typesConditionOf(value)
      if (!types) continue
      if (sub === '.') exportsDeclaresRoot = true
      add(sub, types)
    }
  }

  // A package may declare `types` and no `exports`, or an `exports` map whose
  // root carries no `types` condition; either way `.` is still importable.
  //
  // Keyed on the exports map declaring a root, not on one having resolved. The
  // first version fell back whenever the root was missing, which quietly
  // swapped `poveste`'s real entry for `index.d.ts` — a one-line
  // `export * from './dist/node/index'` shim that answers with zero exports
  // when nothing is built, so an unbuilt tree measured as a valid empty surface.
  const root = manifest.types ?? manifest.typings
  if (root && !exportsDeclaresRoot) add('.', root)

  return found
}

/** The report body, widest surface first — that is where a sentence buys most. */
export function formatRows(rows: Coverage[]): string[] {
  const width = Math.max(0, ...rows.map(row => row.specifier.length))
  return [...rows]
    .sort((a, b) => b.total - a.total || a.specifier.localeCompare(b.specifier))
    .map((row) => {
      const pct = row.total ? Math.round(row.documented / row.total * 100) : 0
      return `  ${row.specifier.padEnd(width)}  ${String(row.documented).padStart(4)} / ${String(row.total).padStart(4)}  ${String(pct).padStart(3)}%`
    })
}

export function summarise(rows: Coverage[]): { documented: number, total: number, pct: number } {
  const documented = rows.reduce((sum, row) => sum + row.documented, 0)
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  return { documented, total, pct: total ? Math.round(documented / total * 100) : 0 }
}

const COMPILER_OPTIONS: ts.CompilerOptions = {
  noEmit: true,
  skipLibCheck: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ESNext,
}

/**
 * Relative imports and exports anywhere in the program that do not resolve.
 *
 * Resolved through `ts.resolveModuleName` rather than read out of the semantic
 * diagnostics: `skipLibCheck` suppresses those entirely for a program of `.d.ts`
 * files (measured — zero diagnostics against a tree that was missing a
 * directory), and turning it off means matching on message text.
 */
function unresolvedRelativeModules(program: ts.Program): string[] {
  const host = ts.createCompilerHost(COMPILER_OPTIONS)
  const missing: string[] = []
  for (const file of program.getSourceFiles()) {
    for (const statement of file.statements) {
      if (!ts.isExportDeclaration(statement) && !ts.isImportDeclaration(statement)) continue
      const specifier = statement.moduleSpecifier
      if (!specifier || !ts.isStringLiteral(specifier)) continue
      if (!specifier.text.startsWith('.')) continue
      if (ts.resolveModuleName(specifier.text, file.fileName, COMPILER_OPTIONS, host).resolvedModule) continue
      missing.push(`${relative(ROOT, file.fileName)} imports ${specifier.text}`)
    }
  }
  return missing
}

function measure(entry: Entrypoint): { coverage: Coverage | null, halfBuilt: string[] } {
  const program = ts.createProgram([entry.types], COMPILER_OPTIONS)
  const halfBuilt = unresolvedRelativeModules(program)
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(entry.types)
  const symbol = source && checker.getSymbolAtLocation(source)
  if (!symbol) return { coverage: null, halfBuilt }

  const undocumented: string[] = []
  let documented = 0
  for (const exported of checker.getExportsOfModule(symbol)) {
    if (exported.getDocumentationComment(checker)?.length) documented++
    else undocumented.push(exported.getName())
  }
  return {
    coverage: { specifier: entry.specifier, total: documented + undocumented.length, documented, undocumented },
    halfBuilt,
  }
}

function main(): void {
  const rows: Coverage[] = []
  const unmeasured: string[] = []

  const broken: string[] = []

  const seen = new Set<string>()

  for (const { name, dir } of publishablePackages()) {
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const entries = entrypointsOf(name, dir, manifest)
    if (!entries.length) {
      unmeasured.push(`${name} — declares no types entrypoint`)
      continue
    }
    for (const entry of entries) seen.add(entry.specifier)
    for (const entry of entries) {
      const excused = UNRESOLVED[entry.specifier]

      if (!entry.resolved) {
        if (excused) unmeasured.push(`${entry.specifier} — ${excused}`)
        else broken.push(`${entry.specifier} declares ${relative(ROOT, entry.types)}, which does not exist`)
        continue
      }

      if (excused) {
        broken.push(`${entry.specifier} resolves now, so its entry in UNRESOLVED is stale — delete it`)
        continue
      }

      const { coverage, halfBuilt } = measure(entry)
      if (halfBuilt.length) {
        // Named individually: "the tree is half built" is not actionable, and
        // the first file listed is usually the one that failed to emit.
        for (const missing of halfBuilt.slice(0, 3)) {
          broken.push(`${entry.specifier} reaches a module that is not there — ${missing}`)
        }
      }
      else if (!coverage) {
        broken.push(`${entry.specifier} resolved to a file that is not a module`)
      }
      else if (coverage.total === 0) {
        broken.push(`${entry.specifier} resolved but exports nothing`)
      }
      else {
        rows.push(coverage)
      }
    }
  }

  for (const specifier of Object.keys(UNRESOLVED)) {
    if (!seen.has(specifier)) {
      broken.push(`UNRESOLVED names ${specifier}, which is not an entrypoint of any published package`)
    }
  }

  // Re-added after the rewrite dropped it. Everything above fails on a
  // measurement that went wrong; this one fails on a measurement that never
  // started, which otherwise prints `0 of 0 … (0%)` and exits 0.
  if (!broken.length && !rows.length) {
    broken.push('no entrypoint was measured at all, so there is no denominator')
  }

  if (broken.length) {
    console.error('❌ The measurement did not happen, so the number below it would be fiction:\n')
    for (const problem of broken) console.error(`  • ${problem}`)
    console.error('\nUsually this is an unbuilt tree — run `pnpm run build` first. A partial run is the failure worth catching: the shims still resolve, so it reports a plausible percentage over a fraction of the surface rather than an obvious zero.')
    process.exit(1)
  }

  console.log('Documented exports, per entrypoint:\n')
  for (const line of formatRows(rows)) console.log(line)

  const { documented, total, pct } = summarise(rows)
  console.log(`\n📖 ${documented} of ${total} exported symbols carry a doc comment across ${rows.length} entrypoints (${pct}%).`)

  // Named with their reasons, one per line, because a package dropping out of
  // the denominator improves the percentage — that has to be legible, not a
  // clause at the end of a sentence.
  if (unmeasured.length) {
    console.log(`\nNot measured (${unmeasured.length}):`)
    for (const entry of unmeasured) console.log(`  • ${entry}`)
  }

  console.log('This step never fails on the number. It is here so the number is measured rather than remembered (#363).')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
