// Reports local tags a release has no business publishing.
//
// bumpp pushes with `git push --tags`, which is every tag on the machine rather
// than the one it just made. Cutting v0.10.0 published
// `salvage/amazing-cerf-61cd4c` — a private tag parked on a maintainer's
// worktree — alongside it (#457).
//
// `scripts/release.ts` now pushes `v<version>` by name, so a stray tag can no
// longer ride along. This is the other half: a machine that cuts releases and
// accumulates untracked tags is the condition that made the leak possible, and
// those tags are invisible until something publishes them.
//
// It warns rather than fails. The tag from #457 is still the only reference
// keeping `66550fae` alive, so deleting it destroys the commit — a release must
// not be blocked by a tag we have deliberately decided to keep.

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
    // Never fails the release. This runs second in `release:check`, ahead of
    // every real gate, and a check that only ever advises must not be the thing
    // that stops a release — `git tag` exits non-zero for a dubious-ownership
    // checkout or a missing git, neither of which says anything about the tags.
    console.warn(`⚠️  Could not read local tags: ${error.message}`)
  }
}
