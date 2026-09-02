// Reports local tags a release has no business publishing (#457).
//
// Warns rather than fails, deliberately: a tag on unmerged work can be the only
// reference keeping that commit alive, so a release must not be blocked by one
// we have decided to keep.

import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

/** The tags a release creates, and the only ones it is ever meant to push. */
export const RELEASE_TAG = /^v\d+\.\d+\.\d+/

export function strayTags(tags: string[]): string[] {
  return tags.filter(tag => tag !== '' && !RELEASE_TAG.test(tag))
}

function localTags(): string[] {
  return String(execFileSync('git', ['tag', '--list'], { stdio: ['ignore', 'pipe', 'pipe'] }))
    .trim()
    .split('\n')
}

function main() {
  const stray = strayTags(localTags())

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

  console.log('✅ No local tags outside v<version>')
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
