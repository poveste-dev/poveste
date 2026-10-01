// Cuts a release: bumps the versions, then pushes the commit and exactly one tag.
//
// bumpp's own push is `git push --tags` — every tag on the machine, not the one
// it just made — so it runs with `--no-push` and the push is spelled out here
// (#457). Nothing on CI can catch that: the push happens locally, before a tag
// ever reaches GitHub.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

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

/** A commit in the range being released, as `git log` hands it over. */
export interface RangeCommit {
  subject: string
  body: string
}

/*
 * Anchored, and not a search for the words. Three `docs(repo)` commits quote
 * `BREAKING CHANGE` in prose while describing this very rule, so a loose match
 * reads the changelog commit of a patch release as a breaking change (#1099).
 */
const BREAKING_FOOTER = /^BREAKING CHANGE: /m

// `fix!:` cannot be written here — commitlint's `subject-exclamation-mark`
// refuses it, which is why the live cases use footers — but an older range or a
// revert can carry one.
const BREAKING_SUBJECT = /^[a-z]+(?:\([^)]*\))?!:/

export function breakingIn(commits: RangeCommit[]): string[] {
  return commits
    .filter(({ subject, body }) => BREAKING_SUBJECT.test(subject) || BREAKING_FOOTER.test(body))
    .map(({ subject }) => subject)
}

const AT_LEAST_MINOR = ['minor', 'major', 'preminor', 'premajor']
const PATCH_SIZED = ['patch', 'prepatch', 'prerelease']

function raisesTheMinor(type: string, current: string): boolean {
  if (AT_LEAST_MINOR.includes(type)) {
    return true
  }
  if (PATCH_SIZED.includes(type)) {
    return false
  }
  // An explicit version, which bumpp also takes: it is only a minor if the minor moves.
  const [major = 0, minor = 0] = type.split('.').map(part => Number.parseInt(part, 10))
  const [atMajor = 0, atMinor = 0] = current.split('.').map(part => Number.parseInt(part, 10))
  return major > atMajor || (major === atMajor && minor > atMinor)
}

/*
 * The release type is picked by hand and bumpp applies whatever it is given, so
 * this is the only thing between a breaking change and a patch release — which a
 * consumer's caret range picks up silently (#1099).
 *
 * A breaking change lands in the minor rather than the major while the package is
 * pre-1.0: `major` is a deliberate stability declaration with its own checklist,
 * as `/cut-a-release` says.
 */
export function bumpProblem(type: string, current: string, commits: RangeCommit[]): string | undefined {
  const breaking = breakingIn(commits)
  if (breaking.length === 0 || raisesTheMinor(type, current)) {
    return undefined
  }
  return [
    `"${type}" is too small for this range: a breaking change belongs in the minor (#1099).`,
    ...breaking.map(subject => `   ${subject}`),
    'Release `minor`, or pass an exact version that raises it.',
  ].join('\n')
}

/**
 * The tag bumpp just created, read from the commit rather than rebuilt from the
 * `tag: 'v%s'` template in bump.config.ts — a second copy of that would push a
 * ref that does not exist the day someone edits the first.
 */
export function selectReleaseTag(tagsAtHead: string[], version: string): string {
  const tags = tagsAtHead.filter(Boolean)
  const [first] = tags
  if (first === undefined) {
    throw new Error(`no tag points at the release commit for ${version} — check \`tag\` in bump.config.ts`)
  }
  if (tags.length === 1) {
    return first
  }
  const naming = tags.filter(tag => tag.includes(version))
  const [named] = naming
  if (named !== undefined && naming.length === 1) {
    return named
  }
  throw new Error(`more than one tag points at the release commit (${tags.join(', ')}) — push the right one by hand`)
}

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: 'inherit', cwd: ROOT })
}

function capture(command: string, args: string[]): string {
  return String(execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT })).trim()
}

const RECORD = '\u001E'

/*
 * The range the release will cover, before bumpp adds to it. `--abbrev=0` gives
 * the last tag reachable from HEAD, which is the previous release.
 *
 * The previous release is the last tag reachable from `HEAD`, which is what you
 * have when the release is cut on `main`. From a branch missing the last release
 * commit — `next`, which never receives bumpp's bump — the range reaches further
 * back, so the check can over-report and never miss.
 *
 * Exported so the gate can be read against a real range without running a
 * release: `main` pushes once bumpp has run, so there is no dry run of it.
 */
export function rangeCommits(from?: string, to = 'HEAD'): RangeCommit[] {
  const previous = from ?? capture('git', ['describe', '--tags', '--abbrev=0'])
  const log = capture('git', ['log', `${previous}..${to}`, `--format=%s%x00%b${RECORD}`])
  return log
    .split(RECORD)
    .map(entry => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [subject = '', body = ''] = entry.split('\0')
      return { subject, body }
    })
}

function main() {
  const type = validateType(process.argv[2])

  const current = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
  const problem = bumpProblem(type, current, rangeCommits())
  if (problem) {
    throw new Error(problem)
  }

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
