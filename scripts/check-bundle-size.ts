// A ceiling on what a built book weighs, because nothing else looks.
//
// `poveste build` shipped a 10 MB `highlighter-*.js` for two languages, and it
// went unnoticed for the life of the project: no test reads the built output,
// and the chunk is lazily loaded so nothing feels slow until someone opens the
// source pane (#304). A number nobody measures is a number that only moves one
// way.
//
// Ceilings rather than exact sizes: this must fail on a regression of the kind
// #304 was — a barrel import re-inflating a chunk by an order of magnitude —
// and not on the ordinary drift of a dependency bump. A limit that cries wolf
// gets raised without being read.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export interface Limit {
  /** Chunks whose basename starts with this, or `''` for the whole build. */
  prefix: string
  /** Kilobytes. */
  max: number
  /** What blew it last time, so a failure explains itself. */
  because: string
}

/**
 * Set from measured output with room above it, not from a target.
 *
 * Each ceiling leaves room for ordinary growth and fails on the
 * order-of-magnitude kind: `highlighter` was 9957 KB before `shiki/core`, and a
 * whole-book ceiling on its own would not have noticed, because one chunk
 * doubling is small against a total set loosely enough never to fire.
 *
 * What a book weighs *now* is not recorded here. It used to be, and it went
 * stale from a change in another package — #374 moved CodeMirror out of
 * `vendor`, and nothing in this file could notice (#601). A run prints every
 * measurement below, so the live numbers are one command away and there is
 * nothing here to quote instead.
 */
export const LIMITS: Limit[] = [
  { prefix: 'highlighter', max: 3000, because: 'importing from `shiki` rather than `shiki/core` ships every grammar and theme (#304)' },
  { prefix: 'vendor', max: 2500, because: 'a dependency inlined into the shared chunk rather than split out of it' },
  { prefix: '', max: 6500, because: 'the whole book, which a user uploads and their host serves' },
]

export interface Chunk { name: string, kb: number }

export function chunksIn(dir: string): Chunk[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => ({
      name: entry.name,
      kb: Math.round(statSync(join(entry.parentPath, entry.name)).size / 1024),
    }))
}

export function totalKb(chunks: Chunk[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.kb, 0)
}

/** The chunks a ceiling covers. `overLimit` and `measurements` must agree. */
export function matching(chunks: Chunk[], limit: Limit): Chunk[] {
  return chunks.filter(chunk => chunk.name.startsWith(limit.prefix))
}

export function overLimit(chunks: Chunk[], limits: Limit[]): string[] {
  return limits.flatMap((limit) => {
    if (limit.prefix === '') {
      const total = totalKb(chunks)
      return total > limit.max ? [`the build is ${total} KB, over its ${limit.max} KB ceiling — ${limit.because}`] : []
    }
    const matched = matching(chunks, limit)
    if (matched.length === 0) {
      // A renamed chunk silently stops being checked, which is the failure this
      // whole file exists to prevent — so an unmatched prefix is a problem.
      return [`no chunk starts with \`${limit.prefix}\`, so its ${limit.max} KB ceiling checked nothing`]
    }
    return matched
      .filter(chunk => chunk.kb > limit.max)
      .map(chunk => `${chunk.name} is ${chunk.kb} KB, over its ${limit.max} KB ceiling — ${limit.because}`)
  })
}

/**
 * What each ceiling is holding, and the largest chunk no ceiling covers.
 *
 * One line per chunk, never a list against a shared limit: `overLimit` applies
 * a prefix ceiling to each chunk separately, so a joined line would read as a
 * sum of something nothing sums.
 *
 * The unprefixed line is the part that is easy to leave out. Every ceiling here
 * is either a named prefix or the whole book, so a chunk between the two — big,
 * but not big enough to move a 6500 KB total — is checked by nothing and, if
 * this printed only the ceilings, named by nothing either (#601).
 */
export function measurements(chunks: Chunk[], limits: Limit[]): string[] {
  const lines = limits.flatMap((limit) => {
    if (limit.prefix === '') {
      return [`whole book ${totalKb(chunks)} KB / ${limit.max} KB`]
    }
    return matching(chunks, limit).map(chunk => `${chunk.name} ${chunk.kb} KB / ${limit.max} KB`)
  })

  // The whole-book ceiling has an empty prefix and so matches everything —
  // count only the named ones, or nothing is ever uncovered.
  const covered = new Set(
    limits
      .filter(limit => limit.prefix !== '')
      .flatMap(limit => matching(chunks, limit).map(chunk => chunk.name)),
  )
  const largest = chunks
    .filter(chunk => !covered.has(chunk.name))
    .sort((a, b) => b.kb - a.kb)[0]
  if (largest) {
    lines.push(`largest chunk under no ceiling: ${largest.name} ${largest.kb} KB`)
  }

  return lines
}

export const EXAMPLE = 'examples/vue3'

export const HIGHLIGHTER = 'packages/poveste-app/src/app/util/highlighter.ts'

/**
 * The regression, caught at its source rather than by its weight.
 *
 * A byte ceiling needs a built book, so it cannot run in `release:check` or
 * `test:scripts` — and the thing it guards is one import line. This reads the
 * file, so it fails in milliseconds and everywhere.
 */
export function barrelImport(source: string): string | undefined {
  const barrel = /^\s*import\s[^\n]*\sfrom\s+'shiki'/m.exec(source)
  return barrel ? barrel[0].trim() : undefined
}

/**
 * The built book, found rather than assumed.
 *
 * `outDir` is a whole relative path — `.poveste/dist` by default — not a parent
 * that `dist` hangs off, so nothing can be derived from its shape. A book is
 * therefore identified by what it is: an `index.html` beside an `assets/`
 * directory.
 */
export function findBook(example: string): string | undefined {
  if (!existsSync(example)) {
    return undefined
  }
  return readdirSync(example, { recursive: true, withFileTypes: true })
    .filter(entry => entry.name === 'index.html' && !entry.parentPath.includes(`${sep}node_modules${sep}`))
    .map(entry => entry.parentPath)
    .find(dir => existsSync(join(dir, 'assets')))
}

function main(): void {
  let book: string | undefined
  try {
    book = findBook(join(ROOT, EXAMPLE))
  }
  catch (error: any) {
    // Narrow: a directory that cannot be read is not the same as one with no
    // book in it, and reporting both as "run story:build" sends the reader
    // after a command that already worked.
    console.error(`::error::could not read ${EXAMPLE}: ${error.message}`)
    process.exit(1)
  }

  if (book === undefined) {
    console.error(`::error::no built book under ${EXAMPLE} — run \`pnpm --filter ./${EXAMPLE} run story:build\` first`)
    process.exit(1)
  }

  const chunks = chunksIn(book)

  const problems = overLimit(chunks, LIMITS)

  const barrel = barrelImport(readFileSync(join(ROOT, HIGHLIGHTER), 'utf8'))
  if (barrel !== undefined) {
    problems.push(`${HIGHLIGHTER} has \`${barrel}\` — the full-bundle entry, which ships every grammar and theme (#304)`)
  }
  for (const line of measurements(chunks, LIMITS)) {
    console.log(`  ${line}`)
  }

  if (problems.length > 0) {
    console.error('::error::A built book is over its size ceiling\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nRaise a ceiling only with a reason written next to it. See scripts/check-bundle-size.ts.')
    process.exit(1)
  }

  console.log(`✅ ${relative(ROOT, book)} is within every ceiling`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
