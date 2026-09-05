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

import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
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
 * Measured at 4990 KB total, `highlighter` 1343 and `vendor` 1840. Each ceiling
 * leaves room for ordinary growth and fails on the order-of-magnitude kind:
 * `highlighter` was 9960 KB before `shiki/core`, and a whole-book ceiling on
 * its own would not have noticed, because one chunk doubling is small against
 * a total set loosely enough never to fire.
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

export function overLimit(chunks: Chunk[], limits: Limit[]): string[] {
  return limits.flatMap((limit) => {
    if (limit.prefix === '') {
      const total = chunks.reduce((sum, chunk) => sum + chunk.kb, 0)
      return total > limit.max ? [`the build is ${total} KB, over its ${limit.max} KB ceiling — ${limit.because}`] : []
    }
    const matched = chunks.filter(chunk => chunk.name.startsWith(limit.prefix))
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

export const EXAMPLE = 'examples/vue3'

/**
 * The built book, found rather than assumed.
 *
 * `outDir` is a config key — `examples/vue3/poveste.config.ts` carries a
 * commented-out `hdist` override — so a hardcoded path would report "not built"
 * about a book that had just been built somewhere else.
 */
export function findBook(example: string): string | undefined {
  return readdirSync(example, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(example, entry.name, 'dist'))
    .find(dist => existsSync(join(dist, 'index.html')))
}

function main(): void {
  const book = findBook(join(ROOT, EXAMPLE))
  if (book === undefined) {
    console.error(`::error::no built book under ${EXAMPLE} — run \`pnpm --filter ./${EXAMPLE} run story:build\` first`)
    process.exit(1)
  }
  const chunks = chunksIn(book)

  const problems = overLimit(chunks, LIMITS)
  if (problems.length > 0) {
    console.error('::error::A built book is over its size ceiling\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nRaise a ceiling only with a reason written next to it. See scripts/check-bundle-size.ts.')
    process.exit(1)
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.kb, 0)
  const largest = [...chunks].sort((a, b) => b.kb - a.kb)[0]
  console.log(`✅ ${relative(ROOT, book)} is ${total} KB, largest chunk ${largest.name} at ${largest.kb} KB`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
