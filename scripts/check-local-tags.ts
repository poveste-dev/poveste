// Reports local tags a release has no business publishing (#457).
//
// Warns rather than fails, deliberately: a tag on unmerged work can be the only
// reference keeping that commit alive, so a release must not be blocked by one
// we have decided to keep.

import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { rootFromArgv } from './check-publishable.ts'

/** The tags a release creates, and the only ones it is ever meant to push. */
export const RELEASE_TAG = /^v\d+\.\d+\.\d+/

export function strayTags(tags: string[]): string[] {
  return tags.filter(tag => tag !== '' && !RELEASE_TAG.test(tag))
}

/**
 * Every tag this checkout has, as git lists them.
 *
 * `cwd` is a parameter with the real value as its default, so a spec can point
 * it at a repository it built rather than the one it is running in (#719).
 *
 * The empty entries go here rather than only in `strayTags`. `''.split('\n')`
 * is `['']`, so a checkout with no tags would otherwise be counted as one —
 * and the count below is the entire point of #740. `strayTags` keeps its own
 * guard regardless: it is exported, and it filters a list it did not produce.
 */
export function localTags(cwd: string = process.cwd()): string[] {
  return String(execFileSync('git', ['tag', '--list'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] }))
    .trim()
    .split('\n')
    .filter(tag => tag !== '')
}

function main() {
  const tags = localTags(rootFromArgv(process.argv) ?? process.cwd())
  const stray = strayTags(tags)

  if (stray.length > 0) {
    console.warn(`⚠️  ${stray.length} local tag${stray.length === 1 ? '' : 's'} not named v<version>:\n`)
    for (const tag of stray) {
      console.warn(`  • ${tag}`)
    }
    console.warn('\nThe release pushes v<version> by name, so these stay local (#457).')
    console.warn('Delete them once you are sure nothing else references their commits — run')
    console.warn('`git log --oneline -1 <tag>` first, since a tag on unmerged work is its only reference.')
    return
  }

  // The count, not the claim. "No local tags outside v<version>" is true of a
  // checkout with fourteen clean tags and of one this check read nothing from,
  // and those are the two states #740 is about. Zero now shows on its face.
  console.log(`✅ ${tags.length} local tag${tags.length === 1 ? '' : 's'}, none outside v<version>`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  }
  catch (error: any) {
    // `git tag` exits non-zero for a dubious-ownership checkout or a missing
    // git, neither of which says anything about the tags.
    console.warn(`⚠️  Could not read local tags: ${error.message}`)
  }
}
