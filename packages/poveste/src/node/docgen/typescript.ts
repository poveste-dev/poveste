import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'pathe'

// Every extractor reads types through TypeScript's JavaScript API. TypeScript 7
// removed it: `vue-component-meta` 3.3 calls `ts.readJsonConfigFile`, and the JSX
// walker and Svelte's `svelte2tsx` host need a `LanguageService` (#1382, #1401).
const NEWEST_MAJOR = 6

const FIX = 'Install `typescript@6` in the book to turn it on, or set `autoDocs: false` to turn it off without this message.'

/** The version of the first `typescript` found in `dirs`, searched in order as Node searches `node_modules`. */
export function typescriptVersionIn(dirs: string[]): string | undefined {
  for (const dir of dirs) {
    const manifest = join(dir, 'typescript', 'package.json')
    if (existsSync(manifest)) {
      return JSON.parse(readFileSync(manifest, 'utf8')).version
    }
  }
  return undefined
}

/** Why auto-docs cannot read component types with the TypeScript in `dirs`, or nothing when it can. */
export function typescriptProblemIn(dirs: string[]): string | undefined {
  const version = typescriptVersionIn(dirs)
  if (!version) {
    return `Auto-docs is off: it reads component types with TypeScript, which this book does not have. ${FIX}`
  }
  if (Number.parseInt(version, 10) > NEWEST_MAJOR) {
    return `Auto-docs is off: it reads component types with TypeScript ${NEWEST_MAJOR} or earlier, and this book has TypeScript ${version}. ${FIX}`
  }
  return undefined
}

/**
 * The same question for the `typescript` an extractor will load: required from
 * `from`, a file, or from the book's own root for `'book'`.
 */
export function typescriptProblem(root: string, from: string): string | undefined {
  const require = createRequire(from === 'book' ? join(root, 'package.json') : from)
  return typescriptProblemIn(require.resolve.paths('typescript') ?? [])
}
