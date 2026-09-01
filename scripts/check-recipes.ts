// Asserts that a recipe the docs hand a reader is the one an example runs.
//
// `docs/guide/config.md` publishes a Quasar config, and `examples/quasar` is the
// book that proves it still works — the two levers in it fail loudly, so a broken
// recipe is a red CI job rather than a page that quietly stopped being true (#436).
//
// That only holds while the example runs the *published* config. It is a copy, and
// a copy drifts: edit the page and the guard silently starts covering something
// else.
//
// Every published line must still be in the example, in order. It was byte-for-byte
// until an example had to carry configuration the recipe must not publish: Quasar's
// book declares the custom background preset the conformance contract requires, and
// putting that on the page would hand a reader a test fixture as setup guidance
// (#499). Layering it into a `vite.config.ts` instead was tried and is not available
// — Quasar owns that file, and adding one breaks its own interop path.
//
// What this no longer notices is an example carrying config the recipe does not
// mention, which is now a legitimate state. Drift in the other direction — a
// published line the example has stopped running — still fails, and that is the
// direction the guard exists for. #540 is where the general shape of "conformance
// config is not user documentation" belongs.
//
// No network, no build: it reads two files and a markdown fence.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Recipe {
  doc: string
  heading: string
  /** One file per ```ts block under the heading, in order. */
  files: string[]
}

const RECIPES: Recipe[] = [
  {
    doc: 'docs/guide/config.md',
    heading: '### Quasar',
    files: [
      'examples/quasar/poveste.config.ts',
      'examples/quasar/src/poveste.setup.ts',
    ],
  },
]

// From the heading to the next one at the same level or above. Matched line by
// line rather than on a surrounding newline, so a heading that opens a file is
// found too — otherwise it reads as a recipe that has been renamed.
export function section(markdown: string, heading: string): string | undefined {
  const lines = markdown.split('\n')
  const start = lines.indexOf(heading)
  if (start === -1) {
    return undefined
  }

  const rest = lines.slice(start + 1)
  const end = rest.findIndex(line => /^#{1,3} /.test(line))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

// A block whose first line is a `// path/to/file` comment is a file the reader is
// told to create, and is compared. A block without one is an illustration — a
// fragment showing how to call something — and is not a file to match.
export function tsBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```ts\n([\s\S]*?)```/g)]
    .map(match => match[1].split('\n'))
    .filter(lines => /^\/\/ [\w./-]+\.\w+$/.test(lines[0] ?? ''))
    .map(lines => lines.slice(1).join('\n'))
}

/**
 * Published lines the example no longer runs, in order.
 *
 * Order matters: a recipe whose lines all appear but shuffled is not the recipe
 * that was published, and imports moving below the config they configure is
 * exactly the kind of "still contains the words" that would pass a set check.
 * Blank lines are ignored — they carry no instruction.
 */
export function missingLines(published: string, actual: string): string[] {
  const actualLines = actual.split('\n').map(line => line.trimEnd())
  const missing: string[] = []
  let cursor = 0

  for (const line of published.split('\n').map(l => l.trimEnd())) {
    if (!line.trim()) {
      continue
    }
    const at = actualLines.indexOf(line, cursor)
    if (at === -1) {
      missing.push(line)
      continue
    }
    cursor = at + 1
  }

  return missing
}

function main(): void {
  const problems: string[] = []

  for (const recipe of RECIPES) {
    const body = section(readFileSync(join(ROOT, recipe.doc), 'utf8'), recipe.heading)
    if (!body) {
      problems.push(`${recipe.doc} has no "${recipe.heading}" section — the recipe this checks has moved or been renamed`)
      continue
    }

    const blocks = tsBlocks(body)
    if (blocks.length !== recipe.files.length) {
      problems.push(`${recipe.doc} "${recipe.heading}" publishes ${blocks.length} ts blocks, but ${recipe.files.length} files are matched against it`)
      continue
    }

    blocks.forEach((block, index) => {
      const file = recipe.files[index]
      const missing = missingLines(block, readFileSync(join(ROOT, file), 'utf8'))
      if (missing.length > 0) {
        problems.push(`${file} no longer runs what "${recipe.heading}" publishes — the example guards a recipe nobody is being given. Missing: ${missing.map(line => JSON.stringify(line)).join(', ')}`)
      }
    })
  }

  if (problems.length > 0) {
    console.error('❌ A published recipe and the example that guards it disagree:\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nCopy the block from the docs into the example, or fix the docs. They are one thing.')
    process.exit(1)
  }

  console.log(`✅ ${RECIPES.length} published recipe${RECIPES.length === 1 ? ' is' : 's are'} exactly what the examples run`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
