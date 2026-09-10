// Prints the CHANGELOG.md section for a release, and fails if there is not one.
//
// The release workflow used to run `changelogithub` unconfigured, which builds the
// body from commit subjects alone — and publishing a non-draft release is what
// sends the subscriber email. CONTRIBUTING then told the maintainer to rewrite the
// body afterwards, and editing a published release never re-notifies. So every
// release since v0.4.0 emailed a commit list and then quietly replaced it with the
// notes that were actually written for those readers (#399).
//
// The notes already exist at tag time: CONTRIBUTING requires the CHANGELOG section
// before `pnpm run release`. This is what lets the workflow publish that section as
// the body, first time.
//
// It fails loudly on a missing section because the alternative is worse than the
// thin body it replaces: `gh release create --notes-file` on an empty file
// publishes a release with no body at all.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHANGELOG = 'CHANGELOG.md'

// Tags are `v0.8.1`; the headings match. Anything else is passed through, so a
// caller that already stripped the prefix still works.
export function normalizeVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`
}

// A ``` block's contents are text, not headings. Without this a code sample
// containing a line that starts `## ` ends the section early, and the rest of the
// notes are dropped from a body that cannot be corrected once it is mailed out.
export function outsideFences(lines: string[]): boolean[] {
  let fenced = false
  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      return false
    }
    return !fenced
  })
}

// Only a release boundary ends a section: the next version, or the divider above
// the inherited histoire history. Ending at any `## ` instead meant an h2 written
// inside a section silently truncated the release body — see `strayHeadings`,
// which turns that into a refusal.
function endsSection(line: string): boolean {
  return /^## v\d/.test(line) || line.startsWith('## Inherited')
}

// From the heading to the next release boundary. The heading itself is dropped —
// the release is already titled with the version.
export function sectionFor(changelog: string, version: string): string | undefined {
  const heading = `## ${normalizeVersion(version)}`
  const lines = changelog.split('\n')
  const live = outsideFences(lines)
  const start = lines.findIndex((line, index) => live[index] && line.trim() === heading)
  if (start === -1) {
    return undefined
  }

  let end = lines.length
  for (let index = start + 1; index < lines.length; index++) {
    if (live[index] && endsSection(lines[index])) {
      end = index
      break
    }
  }

  const body = lines.slice(start + 1, end).join('\n').trim()
  return body.length > 0 ? body : undefined
}

// `##` is the release level in this file, so one inside a section is ambiguous:
// it reads as a new release and was silently cutting the body short. Refusing is
// the point — the alternative is a subscriber email missing everything below it,
// and no way to resend.
export function strayHeadings(changelog: string, version: string): string[] {
  const section = sectionFor(changelog, version)
  if (!section) {
    return []
  }
  const lines = section.split('\n')
  const live = outsideFences(lines)
  return lines.filter((line, index) => live[index] && line.startsWith('## '))
}

/** `commit` in `bump.config.ts`, which is what forms the subject. */
const RELEASE_COMMIT = /^chore: release v/

/**
 * Subjects of commits that landed after the notes were last written.
 *
 * The freeze in #613: a release is a fast-forward, so it ships whatever sits on
 * `next` at the cut — while the section was written against an earlier tip.
 * Anything committed after the last edit to CHANGELOG.md is work the notes have
 * not been read against, which is the leak, stated exactly.
 *
 * Exact, rather than comparing subjects against the prose. The notes cite
 * issue numbers while squash subjects carry PR numbers, and step 2 of the
 * skill tells the writer to skip anything a consumer cannot see — so a textual
 * comparison would be wrong in both directions and would train people to ignore
 * the one control that matters here.
 *
 * Self-clearing: re-reading the notes and touching the file moves the marker, so
 * a deliberate omission is acknowledged by the same act that records it.
 *
 * The release commit is dropped. It bumps every `package.json` and touches
 * nothing else, so it always sorts after the commit that wrote the notes — the
 * warning would fire on every release, naming the release itself, from the
 * first one. A control that is wrong every time is one people learn to skip,
 * which is the failure this whole check is written against.
 */
export function subjectsAfter(log: string): string[] {
  return log
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(subject => !RELEASE_COMMIT.test(subject))
}

/**
 * The warning body. Written to stderr by the caller and never to stdout:
 * `release.yml` redirects this script's stdout into the file it publishes as the
 * release body, so a line printed the other way would be mailed to every
 * subscriber as part of the notes.
 */
export function freezeWarning(subjects: string[]): string[] {
  return [
    `::warning::${subjects.length} commit${subjects.length === 1 ? '' : 's'} landed after the ${CHANGELOG} section was last written`,
    ...subjects.map(subject => `  • ${subject}`),
    '',
    'A release is a fast-forward, so these ship whether or not the notes mention them (#613).',
    `Re-read the section against them. If they are deliberately unmentioned — a chore a consumer cannot see — say so by touching ${CHANGELOG}, which also clears this.`,
  ]
}

export function releasedVersions(changelog: string): string[] {
  return [...changelog.matchAll(/^## (v\d\S*)\s*$/gm)].map(match => match[1])
}

/**
 * `git log` for everything after the commit that last touched CHANGELOG.md.
 *
 * Returns nothing rather than throwing when git cannot answer — a shallow
 * checkout has no range to compute, and this is a warning, not a gate.
 */
function commitsSinceNotes(): string {
  try {
    const notesCommit = execFileSync('git', ['log', '-1', '--format=%H', '--', CHANGELOG], { cwd: ROOT, encoding: 'utf8' }).trim()
    if (!notesCommit) return ''
    return execFileSync('git', ['log', `${notesCommit}..HEAD`, '--format=%s'], { cwd: ROOT, encoding: 'utf8' })
  }
  catch {
    return ''
  }
}

function main(): void {
  const version = process.argv[2]
  if (!version) {
    console.error(`Usage: check-changelog.ts <version>\n\nPrints the ${CHANGELOG} section for that release.`)
    process.exit(1)
  }

  const changelog = readFileSync(join(ROOT, CHANGELOG), 'utf8')
  const section = sectionFor(changelog, version)

  const stray = strayHeadings(changelog, version)
  if (stray.length > 0) {
    console.error(`::error::${CHANGELOG}'s ${normalizeVersion(version)} section contains a heading at the release level`)
    for (const heading of stray) {
      console.error(`  • ${heading}`)
    }
    console.error(`\nUse \`###\` for sub-headings — \`##\` starts a new release, and used inside a section it silently cuts the published body short.`)
    process.exit(1)
  }

  if (!section) {
    const known = releasedVersions(changelog).slice(0, 5).join(', ')
    console.error(`::error::${CHANGELOG} has no section for ${normalizeVersion(version)}`)
    console.error(`\nThe GitHub release body is this section, and the release notification is sent with it — so there is no fixing it afterwards.`)
    console.error(`Add the section to ${CHANGELOG} before cutting the tag. Newest sections present: ${known}`)
    process.exit(1)
  }

  // After the hard failures: a leaked commit is worth knowing about, but not at
  // the cost of blocking a release over a judgement the writer may have already
  // made. `test:tags` warns for the same reason.
  const leaked = subjectsAfter(commitsSinceNotes())
  if (leaked.length > 0) {
    for (const line of freezeWarning(leaked)) console.error(line)
  }

  console.log(section)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
