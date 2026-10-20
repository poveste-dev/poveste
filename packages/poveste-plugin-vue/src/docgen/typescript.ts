import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'pathe'

// `vue-component-meta` 3.3 calls `ts.readJsonConfigFile`, which TypeScript 7 no
// longer has, and no release of it reads TypeScript 7 yet (#1382).
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

/** Why auto-docs cannot read a Vue component's types with the TypeScript in `dirs`, or nothing when it can. */
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
 * The same question for the TypeScript `vue-component-meta` will load: it requires
 * `typescript` from where it is installed, an optional peer that npm does not add.
 */
export function typescriptProblem(): string | undefined {
  const meta = createRequire(import.meta.url).resolve('vue-component-meta')
  return typescriptProblemIn(createRequire(meta).resolve.paths('typescript') ?? [])
}
