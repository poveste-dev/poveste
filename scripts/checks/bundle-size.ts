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

import type { CheckResult } from './support/check-result.ts'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

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
 * `vendor` and the whole book are the exception, and deliberately: #791 removed
 * 257 KB of devtools code a reader cannot use, and a ceiling with the old room
 * above it would have let every byte of it back in silently. They are set to
 * fire on that return rather than on an order of magnitude, which buys less
 * headroom for ordinary growth — raise them with a measurement and a reason
 * rather than to make a red run green.
 *
 * The migration is done: #63 moved the controls onto Reka UI and #918 took
 * floating-vue out of the chrome, so these hold the finished numbers.
 *
 * They came down by less than that sounds, and the reason is worth knowing
 * before anyone reads a small drop as a small win. The book measured is
 * `examples/vue`, which depends on floating-vue itself for the story about
 * restyling a consumer's own teleported popper — so the library still ships
 * here and always will. What these numbers show is the chrome's own install
 * and theme leaving, not the library.
 *
 * The margins matter more than the drop. Each ceiling sits close enough to the
 * measurement that the regression it names still trips it: at the old 1560 KB,
 * `vendor` had 165 KB of slack and a control quietly becoming eager costs 90 —
 * so it would have passed. A ceiling re-set after a win has to be re-set far
 * enough, or the win silently buys room for the thing it was guarding against.
 *
 * The two say different things and the difference is the point. The whole book
 * is every chunk a host serves, so a lazily loaded control is in it either way.
 * `vendor` is what a reader downloads before anything renders, which is where
 * laziness shows and where a control that quietly stops being lazy reappears.
 *
 * What a book weighs *now* is not recorded here. It used to be, and it went
 * stale from a change in another package — #374 moved CodeMirror out of
 * `vendor`, and nothing in this file could notice (#601). A run prints every
 * measurement below, so the live numbers are one command away and there is
 * nothing here to quote instead.
 */
export const LIMITS: Limit[] = [
  { prefix: 'highlighter', max: 3000, because: 'importing from `shiki` rather than `shiki/core` ships every grammar and theme (#304)' },
  { prefix: 'vendor', max: 1450, because: 'what a reader downloads before anything renders, so this is the one #63 tracks: 1395 KB with the date and colour controls lazy and floating-vue out of the chrome (#918). Deliberately tighter than the others — either control becoming eager again is 90 KB or 201 KB and both land here, so this has to stay under 1485 to catch the smaller one (#63). Also the devtools payload #791 removed coming back, which put this chunk at 1519 KB' },
  { prefix: '', max: 5220, because: 'the whole book, which a user uploads and their host serves — every chunk, so laziness does not move it and only `vendor` above shows that. 5100 until Reka UI, 5388 KB with it and two new controls (#63), and 5114 KB once the vendors prebundle went (#347) and the chrome stopped installing floating-vue (#918). Has to stay under 5367 to catch the 257 KB of devtools payload #791 removed coming back' },
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

export const EXAMPLE = 'examples/vue'

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

const REMEDY = 'Raise a ceiling only with a reason written next to it. See scripts/checks/bundle-size.ts.'

export function checkBundleSize(root = ROOT): CheckResult {
  let book: string | undefined
  try {
    book = findBook(join(root, EXAMPLE))
  }
  catch (error: any) {
    // Narrow: a directory that cannot be read is not the same as one with no
    // book in it, and reporting both as "run story:build" sends the reader
    // after a command that already worked.
    return { problems: [`could not read ${EXAMPLE}: ${error.message}`], remedy: REMEDY, notes: [] }
  }

  if (book === undefined) {
    return { problems: [`no built book under ${EXAMPLE} — run \`pnpm --filter ./${EXAMPLE} run story:build\` first`], remedy: REMEDY, notes: [] }
  }

  const chunks = chunksIn(book)
  const problems = overLimit(chunks, LIMITS)

  const barrel = barrelImport(readFileSync(join(root, HIGHLIGHTER), 'utf8'))
  if (barrel !== undefined) {
    problems.push(`${HIGHLIGHTER} has \`${barrel}\` — the full-bundle entry, which ships every grammar and theme (#304)`)
  }

  return { problems, remedy: REMEDY, notes: measurements(chunks, LIMITS) }
}
