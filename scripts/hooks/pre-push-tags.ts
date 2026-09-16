// Refuses a push carrying a tag a release did not make (#457).
//
// This is the one defect class no CI check can reach: `release.ts` pushes the
// commit and exactly one tag because bumpp's own push is `git push --tags`,
// every tag on the machine. The mistake happens locally, before any tag exists
// on the remote, so by the time CI could look the tag is already public — which
// is how a maintainer's private `salvage/…` tag reached this repository during
// v0.10.0.
//
// `strayTags` is imported rather than restated. A second copy of the release
// tag pattern is a second thing to keep in step with `checks/local-tags.ts`.

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { strayTags } from '../checks/local-tags.ts'

const TAG_REF = /^refs\/tags\/(.+)$/

/** The all-zero sha git sends as the local sha of a deletion. */
const DELETED = /^0{40,}$/

/**
 * The tag names a push is creating or updating, from git's pre-push stdin.
 *
 * Each line is `<local ref> <local sha> <remote ref> <remote sha>`, and the
 * **remote** ref is the one to read, because that is the name that becomes
 * public. Reading the local ref instead misses `git push <sha>:refs/tags/x`,
 * which git reports with the raw sha in the local field.
 *
 * A deletion is excluded by its all-zero local sha rather than by its `(delete)`
 * local ref, since removing a tag from the remote is not what this guards.
 */
export function pushedTags(stdin: string): string[] {
  return stdin.split('\n')
    .flatMap((line) => {
      const [, localSha, remoteRef] = line.split(' ')
      if (localSha === undefined || DELETED.test(localSha)) {
        return []
      }
      return TAG_REF.exec(remoteRef ?? '')?.[1] ?? []
    })
}

/** What to say about a push, or nothing when it carries no stray tag. */
export function refusal(tags: string[]): string | undefined {
  const stray = strayTags(tags)
  if (stray.length === 0) {
    return undefined
  }

  return [
    `✖  ${stray.length} tag${stray.length === 1 ? '' : 's'} in this push ${stray.length === 1 ? 'is' : 'are'} not named v<version>:`,
    '',
    ...stray.map(tag => `  • ${tag}`),
    '',
    'A release pushes one v<version> tag by name. Anything else here is local work',
    'that would become public and permanent on a repository strangers watch (#457).',
    '',
    'Push the branch alone, or if you mean it: git push --no-verify',
  ].join('\n')
}

// `readFileSync(0)` throws when there is no stdin to read, which is not a
// statement about the push — a guard that fails closed on its own plumbing
// would block every push the moment git changed how it invokes this.
function main(): void {
  let stdin: string
  try {
    stdin = readFileSync(0, 'utf8')
  }
  catch {
    return
  }

  const message = refusal(pushedTags(stdin))
  if (message !== undefined) {
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}

main()
