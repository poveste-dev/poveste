// A story's `.story.md` companion fills the Docs panel, which is a surface of
// its own. `SHARED_STORY_TITLES` in `e2e/stories.ts` compares titles, and a
// companion adds none — so `Meow` had one in the two Vue books and neither
// Svelte book, and every parity check passed (#475).

import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// The books that carry the conformance story set, per `e2e/stories.ts`. An
// example outside it is free to carry its own stories and is not compared.
const BOOKS = ['vue3', 'nuxt4', 'svelte5', 'sveltekit']

const STORY_FILE = /\.story\.[^.]+$/
const IGNORED = new Set(['node_modules', '.poveste', '.svelte-kit', 'dist', 'test-results'])

/**
 * Stories documented in one book and not in another that has the same story.
 *
 * The evidence is a book carrying *both* the story and its companion. A
 * `.story.md` standing alone is a docs-only page, and a book is free not to have
 * one — `Introduction` is a page in the Svelte books and a story in the Vue
 * ones, which is a name they share rather than drift.
 */
export function undocumentedInSomeBooks(byBook: Record<string, string[]>): string[] {
  const stories = new Map<string, Set<string>>()
  const documented = new Map<string, Set<string>>()

  for (const [book, files] of Object.entries(byBook)) {
    for (const file of files) {
      const name = file.replace(STORY_FILE, '')
      const into = file.endsWith('.story.md') ? documented : stories
      into.set(name, (into.get(name) ?? new Set()).add(book))
    }
  }

  const problems: string[] = []
  for (const [name, carrying] of stories) {
    const pairs = [...carrying].filter(book => documented.get(name)?.has(book))
    if (pairs.length === 0) {
      continue
    }
    for (const book of carrying) {
      if (!pairs.includes(book)) {
        problems.push(`${name}.story.md is in ${pairs.sort().join(', ')} but not in ${book}`)
      }
    }
  }
  return problems.sort()
}

async function storyFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED.has(entry.name)) {
        found.push(...await storyFiles(join(dir, entry.name)))
      }
    }
    else if (STORY_FILE.test(entry.name)) {
      found.push(entry.name)
    }
  }
  return found
}

async function main(): Promise<void> {
  const byBook: Record<string, string[]> = {}
  for (const book of BOOKS) {
    byBook[book] = await storyFiles(join(ROOT, 'examples', book))
  }

  const problems = undocumentedInSomeBooks(byBook)
  if (problems.length > 0) {
    console.error(`❌ ${problems.length} ${problems.length === 1 ? 'story is' : 'stories are'} documented in some books and not others:`)
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    console.error('\nAdd the missing `.story.md`, or remove the ones that exist.')
    process.exit(1)
  }

  console.log(`✅ Every story documented in one of the ${BOOKS.length} conformance books is documented in all of them`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
