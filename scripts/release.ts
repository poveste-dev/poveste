// Cuts a release: bumps the versions, then pushes the commit and exactly one tag.
//
// bumpp's own push is `git push` followed by `git push --tags`, which publishes
// every tag on the machine. That is how cutting v0.10.0 also published a
// maintainer's private `salvage/…` tag (#457). Nothing on CI can catch it: the
// push happens locally, before a tag ever reaches GitHub.
//
// So bumpp runs with `--no-push` — belt and braces alongside `push: false` in
// bump.config.ts — and the push is spelled out here. The release says what it
// pushed, and a stray local tag stays local.
//
// It also takes the release type as a positional argument rather than leaving it
// to land on the end of a script string as bumpp's trailing `--release` value.
// That arrangement worked, but only while nothing was ever appended after it,
// and it failed by dropping to an interactive prompt rather than saying so.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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

/**
 * The tag bumpp just created, read from the commit rather than rebuilt from a
 * template. `tag: 'v%s'` lives in bump.config.ts, and a second copy of it here
 * would push a ref that does not exist the day someone edits that one — after
 * the release commit is already public.
 */
export function selectReleaseTag(tagsAtHead: string[], version: string): string {
  const tags = tagsAtHead.filter(Boolean)
  if (tags.length === 0) {
    throw new Error(`no tag points at the release commit for ${version} — check \`tag\` in bump.config.ts`)
  }
  if (tags.length === 1) {
    return tags[0]
  }
  const naming = tags.filter(tag => tag.includes(version))
  if (naming.length === 1) {
    return naming[0]
  }
  throw new Error(`more than one tag points at the release commit (${tags.join(', ')}) — push the right one by hand`)
}

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: 'inherit', cwd: ROOT })
}

function capture(command: string, args: string[]): string {
  return String(execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT })).trim()
}

function main() {
  const type = validateType(process.argv[2])

  run('pnpm', ['exec', 'bumpp', '--yes', '--no-push', '--release', type])

  const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const tag = selectReleaseTag(capture('git', ['tag', '--points-at', 'HEAD']).split('\n'), version)

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
