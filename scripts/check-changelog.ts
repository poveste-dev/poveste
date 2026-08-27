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

export function releasedVersions(changelog: string): string[] {
  return [...changelog.matchAll(/^## (v\d\S*)\s*$/gm)].map(match => match[1])
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

  console.log(section)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
