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

import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
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
 * `highlighter` was 9960 KB before `shiki/core`; 3000 KB fails a return to the
 * barrel import while leaving room for a grammar or two to be added on purpose.
 */
export const LIMITS: Limit[] = [
  { prefix: 'highlighter', max: 3000, because: 'importing from `shiki` rather than `shiki/core` ships every grammar and theme (#304)' },
  { prefix: '', max: 9000, because: 'the whole book, which a user uploads and their host serves' },
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

export const BOOK = 'examples/vue3/.poveste/dist'

function main(): void {
  const dist = join(ROOT, BOOK)
  let chunks: Chunk[]
  try {
    chunks = chunksIn(dist)
  }
  catch {
    console.error(`::error::${BOOK} is not built — run \`pnpm --filter ./examples/vue3 run story:build\` first`)
    process.exit(1)
  }

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
  console.log(`✅ ${BOOK} is ${total} KB, largest chunk ${largest.name} at ${largest.kb} KB`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
