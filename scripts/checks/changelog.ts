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
import { breakingIn, rangeCommits } from '../release/release.ts'
import { rootFromArgv } from './publishable.ts'
import { captured } from './support/captured.ts'

// `--root` so a spec can run this as a process over a tree where it has to
// fail: the exit status is the verdict, and no spec reached it (#760).
const ROOT = rootFromArgv(process.argv) ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..')
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

// The divider above the inherited histoire history, at whatever heading level it
// is written. It is `#` in the file and this predicate required `##`, which was
// the spec fixture's level and not the file's — so the branch never fired where
// it mattered, and `v0.1.0` published the divider and its paragraph as part of
// its notes. Locating this line reliably is also what tells the two halves of
// the file apart, which is the whole of #1071.
const INHERITED_HEADING = /^#{1,6} +Inherited histoire changelog/

function dividerIn(lines: string[], live: boolean[]): number {
  return lines.findIndex((line, index) => live[index] && INHERITED_HEADING.test(line))
}

// Only a release boundary ends a section: the next version, or the divider above
// the inherited histoire history. Ending at any `## ` instead meant an h2 written
// inside a section silently truncated the release body — see `strayHeadings`,
// which turns that into a refusal.
function endsSection(line: string): boolean {
  return /^## v\d/.test(line) || INHERITED_HEADING.test(line)
}

/** Every line a version's heading is written on, 1-based, per half of the file. */
export interface HeadingSites {
  poveste: number[]
  inherited: number[]
}

/*
 * Poveste restarted at `0.1.0` and histoire's numbers run higher, so a poveste
 * version usually has a histoire heading as well — every version from v0.16.3 to
 * v0.17.17 did at 0.16.2. Taking the first match handed back histoire's section
 * for a version poveste had not written up, and exited 0, so `release.yml`
 * published another project's notes to every watcher (#1071).
 *
 * Which half a heading is in is the answer, not how many there are: one match in
 * the inherited half is a missing section, and two in poveste's own half is a
 * duplicate nobody can resolve for the caller.
 */
export function headingSites(changelog: string, version: string): HeadingSites {
  const heading = `## ${normalizeVersion(version)}`
  const lines = changelog.split('\n')
  const live = outsideFences(lines)
  const divider = dividerIn(lines, live)
  const sites: HeadingSites = { poveste: [], inherited: [] }
  lines.forEach((line, index) => {
    if (!live[index] || line.trim() !== heading) {
      return
    }
    const half = divider !== -1 && index > divider ? sites.inherited : sites.poveste
    half.push(index + 1)
  })
  return sites
}

// From the heading to the next release boundary. The heading itself is dropped —
// the release is already titled with the version.
export function sectionFor(changelog: string, version: string): string | undefined {
  const [site, ...rest] = headingSites(changelog, version).poveste
  if (site === undefined || rest.length > 0) {
    return undefined
  }

  const lines = changelog.split('\n')
  const live = outsideFences(lines)
  const start = site - 1
  const next = lines.findIndex((line, index) => index > start && live[index] && endsSection(line))
  const end = next === -1 ? lines.length : next

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

/**
 * Every `## v` heading histoire wrote, which is all the inherited half may hold.
 *
 * That half is frozen history, so this list cannot go stale. It is what tells a
 * poveste section written below the divider from histoire's own: any heading in
 * that half is legitimate on its face, and only the version says it is not
 * histoire's (#1104). Older histoire sections use `## [0.15.8](…)` and are not
 * headings this file's tooling reads.
 */
export const HISTOIRE_VERSIONS = [
  'v1.0.0-beta.1',
  'v1.0.0-alpha.5',
  'v1.0.0-alpha.4',
  'v1.0.0-alpha.3',
  'v1.0.0-alpha.2',
  'v1.0.0-alpha.1',
  'v0.17.17',
  'v0.17.16',
  'v0.17.15',
  'v0.17.14',
  'v0.17.13',
  'v0.17.12',
  'v0.17.11',
  'v0.17.10',
  'v0.17.9',
  'v0.17.8',
  'v0.17.7',
  'v0.17.6',
  'v0.17.5',
  'v0.17.4',
  'v0.17.3',
  'v0.17.2',
  'v0.17.1',
  'v0.17.0',
  'v0.16.5',
  'v0.16.4',
  'v0.16.3',
  'v0.16.2',
  'v0.16.1',
  'v0.16.0',
  'v0.15.9',
]

/**
 * Sections that landed where `sectionFor` will not find them at tag time.
 *
 * Every per-PR check passes these, because a version whose notes went into the
 * inherited half looks exactly like a version poveste never wrote up — and that
 * is correct behaviour as far as anything else can tell. The cost is a release
 * run that fails at the tag, with `main` already fast-forwarded (#1104).
 *
 * Each problem names the line and the half, which is what was actually needed
 * both times this was hit while writing 0.17.0.
 */
export function placementProblems(changelog: string): string[] {
  const lines = changelog.split('\n')
  const live = outsideFences(lines)
  const divider = dividerIn(lines, live)
  const problems: string[] = []
  const below = divider === -1 ? '' : `, below the divider at line ${divider + 1}`

  const seen = new Map<string, number[]>()
  lines.forEach((line, index) => {
    const version = live[index] ? line.match(/^## (v\d\S*)\s*$/)?.[1] : undefined
    if (version !== undefined) {
      const key = `${divider !== -1 && index > divider ? 'inherited' : 'poveste'} ${version}`
      seen.set(key, [...(seen.get(key) ?? []), index + 1])
    }
  })

  for (const [key, at] of seen) {
    const [half, version = ''] = key.split(' ')
    if (half === 'inherited') {
      if (!HISTOIRE_VERSIONS.includes(version)) {
        problems.push(`line ${at.join(' and ')}: \`## ${version}\` is in the inherited histoire half${below}, and histoire never released ${version}. Move poveste's notes above the divider.`)
      }
      else if (at.length > 1) {
        problems.push(`lines ${at.join(' and ')}: \`## ${version}\` appears ${at.length} times in the inherited histoire half${below}. One is histoire's; poveste's notes for ${version} belong above the divider.`)
      }
      continue
    }
    if (at.length > 1) {
      problems.push(`lines ${at.join(' and ')}: \`## ${version}\` appears ${at.length} times in poveste's half, and only one of them can be published.`)
    }
    else if (sectionFor(changelog, version) === undefined) {
      problems.push(`line ${at.join('')}: \`## ${version}\` has no notes under it, so there is nothing to publish.`)
    }
  }

  return problems
}

const BREAKING_HEADING = /^### 🚨 Breaking Changes\s*$/

/**
 * A breaking range with no breaking heading, as the lines to print.
 *
 * The section is the only place that heading can come from. The commit list
 * `release.yml` appends is changelogithub's, which reads a breaking change from a
 * `!` in a subject and nothing else; this repo marks them with footers, because
 * commitlint refuses `!`. Not conditional on that ban: if `!` became legal, the
 * generated list would gain the heading below the `---`, and a reader still meets
 * the hand-written section first (#1103).
 */
export function breakingHeadingProblem(section: string, version: string, breaking: string[]): string[] {
  const lines = section.split('\n')
  const live = outsideFences(lines)
  if (breaking.length === 0 || lines.some((line, index) => live[index] && BREAKING_HEADING.test(line))) {
    return []
  }
  return [
    `::error::${normalizeVersion(version)} carries a breaking change, and its ${CHANGELOG} section has no \`### 🚨 Breaking Changes\` heading`,
    ...breaking.map(subject => `  • ${subject}`),
    '',
    'Nothing generated will add it. The commit list appended to the release is changelogithub\'s, which reads a breaking change only from a `!` in a subject; this repo writes them as `BREAKING CHANGE:` footers, so that list files them under their type with no marker.',
    'Add the heading to the section and say what a consumer has to change.',
  ]
}

/**
 * The commits a release covers: from the previous `v` tag to this version's tag,
 * or to `HEAD` before the tag exists. `release.yml` runs this at the tag and the
 * release skill runs it just before, so both have to land on the same range.
 *
 * `undefined` when git cannot answer, which the caller reports rather than
 * reading as "nothing breaks".
 */
function breakingInRelease(version: string): string[] | undefined {
  const tag = normalizeVersion(version)
  try {
    const git = (args: string[]) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    const to = git(['tag', '--list', tag]) === tag ? tag : 'HEAD'
    const from = git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', `${to}^`])
    return breakingIn(rangeCommits(from, to, ROOT))
  }
  catch {
    return undefined
  }
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

// Poveste's own, which is what the caller offers as "sections present". The
// inherited half holds histoire's releases too, and naming those would point a
// reader at the wrong half of the file while they are trying to add a section.
export function releasedVersions(changelog: string): string[] {
  const lines = changelog.split('\n')
  const divider = dividerIn(lines, outsideFences(lines))
  const own = (divider === -1 ? lines : lines.slice(0, divider)).join('\n')
  return [...own.matchAll(/^## (v\d\S*)\s*$/gm)].map(match => captured(match))
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

// A `return` after each exit, so a guard whose exit is lost ends `main()` with
// status 0 — which the specs assert against — rather than falling into a crash
// that exits non-zero with the right message already printed (#766).
function main(): void {
  const version = process.argv[2]
  if (!version) {
    console.error(`Usage: checks/changelog.ts <version>\n\nPrints the ${CHANGELOG} section for that release.`)
    process.exit(1)
    return
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
    return
  }

  if (!section) {
    const sites = headingSites(changelog, version)

    // Naming both lines is the whole value of refusing here. Taking one of them
    // is what let this reach a published body, and a reader cannot act on
    // "ambiguous" without being told where the other one is.
    if (sites.poveste.length > 1) {
      console.error(`::error::${CHANGELOG} has ${sites.poveste.length} sections for ${normalizeVersion(version)}, at lines ${sites.poveste.join(' and ')}`)
      console.error(`\nOne of them would be published as the release body and this script cannot tell which. Remove or renumber the duplicate.`)
      process.exit(1)
      return
    }

    const known = releasedVersions(changelog).slice(0, 5).join(', ')
    console.error(`::error::${CHANGELOG} has no section for ${normalizeVersion(version)}`)
    if (sites.poveste.length === 0 && sites.inherited.length > 0) {
      console.error(`\nThere is a ${normalizeVersion(version)} heading at line ${sites.inherited.join(' and ')}, in the inherited histoire changelog — histoire released this version too.`)
      console.error(`That is not poveste's section, and publishing it would email every watcher another project's release notes.`)
    }
    console.error(`\nThe GitHub release body is this section, and the release notification is sent with it — so there is no fixing it afterwards.`)
    console.error(`Add the section to ${CHANGELOG} before cutting the tag. Newest sections present: ${known}`)
    process.exit(1)
    return
  }

  const breaking = breakingInRelease(version)
  if (breaking === undefined) {
    console.error(`::warning::git could not read the commits in ${normalizeVersion(version)}, so nothing checked whether the section has to say it breaks`)
  }
  else {
    const problem = breakingHeadingProblem(section, version, breaking)
    if (problem.length > 0) {
      for (const line of problem) console.error(line)
      process.exit(1)
      return
    }
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
