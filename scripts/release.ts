// Cuts a release: bumps the versions, then pushes the commit and exactly one tag.
//
// bumpp's own push is `git push` followed by `git push --tags`, which publishes
// every tag on the machine. That is how cutting v0.10.0 also published a
// maintainer's private `salvage/…` tag (#457). Nothing on CI can catch it: the
// push happens locally, before a tag ever reaches GitHub.
//
// So bumpp runs with `--no-push` and the push is spelled out here. The release
// says what it pushed, and a stray local tag stays local.
//
// It also takes the release type as a positional argument rather than leaving it
// to land on the end of a script string as bumpp's trailing `--release` value.
// That arrangement worked, but it broke in ways that read as bumpp being
// interactive — see the note in CONTRIBUTING.md about `--`.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

export const RELEASE_TYPES = ['patch', 'minor', 'major', 'prerelease', 'prepatch', 'preminor', 'premajor']

export function validateType(type: string | undefined): string {
  if (!type) {
    throw new Error('a release type is required: pnpm run release patch (or minor, major)')
  }
  // An explicit version is as valid as a keyword, and bumpp accepts both.
  if (!RELEASE_TYPES.includes(type) && !/^\d+\.\d+\.\d+/.test(type)) {
    throw new Error(`unknown release type "${type}" — expected one of ${RELEASE_TYPES.join(', ')}, or a version`)
  }
  return type
}

export function tagFor(version: string): string {
  return `v${version}`
}

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: 'inherit' })
}

function main() {
  const type = validateType(process.argv[2])

  run('pnpm', ['exec', 'bumpp', '--yes', '--no-push', '--release', type])

  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  const tag = tagFor(version)

  run('git', ['push'])
  run('git', ['push', 'origin', `refs/tags/${tag}`])

  console.log(`\n✅ Pushed the release commit and ${tag}. No other tag was pushed (#457).`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  }
  catch (error: any) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}
