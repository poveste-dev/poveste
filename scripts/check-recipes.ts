// Asserts that a recipe the docs hand a reader is the one an example runs.
//
// `docs/guide/config.md` publishes a Quasar config, and `examples/quasar` is the
// book that proves it still works — the two levers in it fail loudly, so a broken
// recipe is a red CI job rather than a page that quietly stopped being true (#436).
//
// That only holds while the example runs the *published* config. It is a copy, and
// a copy drifts: edit the page and the guard silently starts covering something
// else. So the files are compared, byte for byte.
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

// From the heading to the next one at the same level or above.
export function section(markdown: string, heading: string): string | undefined {
  const start = markdown.indexOf(`\n${heading}\n`)
  if (start === -1) {
    return undefined
  }
  const rest = markdown.slice(start + heading.length + 2)
  const end = rest.search(/\n#{1,3} /)
  return end === -1 ? rest : rest.slice(0, end)
}

// The first line of a published block names the file it belongs in; it is a label
// for the reader, not part of the recipe.
export function tsBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```ts\n([\s\S]*?)```/g)]
    .map(match => match[1].split('\n').slice(1).join('\n'))
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
      if (readFileSync(join(ROOT, file), 'utf8') !== block) {
        problems.push(`${file} is not what "${recipe.heading}" publishes — the example guards a recipe nobody is being given`)
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
