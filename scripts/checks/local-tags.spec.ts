import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { tree } from '../fixture-tree.ts'
import { localTags, reportLocalTags, strayTags } from './local-tags.ts'

/**
 * A repository with the tags named on it, and nothing else.
 *
 * A real one rather than a stubbed reader: the half this check had no coverage
 * for is the one that shells out to git and reads what comes back, and a stub
 * that returns a list is an assertion about the stub (#719).
 */
function repoWith(tags: string[]): string {
  const root = tree({ 'README.md': '# fixture' })
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })

  git('init', '--quiet')
  git('config', 'user.email', 'fixture@example.invalid')
  git('config', 'user.name', 'Fixture')
  git('commit', '--quiet', '--allow-empty', '-m', 'root')
  for (const tag of tags) {
    git('tag', tag)
  }

  return root
}

describe('localTags', () => {
  it('reads the tags a repository actually has', () => {
    expect(localTags(repoWith(['v0.1.0', 'salvage/thing'])).sort()).toEqual(['salvage/thing', 'v0.1.0'])
  })

  // `''.split('\n')` is `['']`, so a repository with no tags would be counted
  // as having one — and the count is the whole of #740.
  it('reports no tags rather than one empty one', () => {
    expect(localTags(repoWith([]))).toEqual([])
  })
})

describe('strayTags', () => {
  it('is silent when every tag is a release tag', () => {
    expect(strayTags(['v0.10.0', 'v0.11.0'])).toEqual([])
  })

  it('does not treat a prerelease tag as stray', () => {
    expect(strayTags(['v0.12.0-beta.1'])).toEqual([])
  })

  // The tag that actually leaked when v0.10.0 was cut (#457).
  it('names a private tag parked on the machine', () => {
    expect(strayTags(['v0.10.0', 'salvage/amazing-cerf-61cd4c'])).toEqual(['salvage/amazing-cerf-61cd4c'])
  })

  // `localTags` filters this too. Asserted on both because they guard for
  // different reasons: one is what git prints, the other is an exported
  // function taking a list it did not produce.
  it('keeps its own guard against the empty entry', () => {
    expect(strayTags([''])).toEqual([])
  })
})

// The two states #740 is about. Both are clean, and before this they reported
// the same line — so a check that had stopped reading tags entirely was
// indistinguishable from one that read fourteen and found nothing wrong.
describe('reportLocalTags', () => {
  it('counts the tags it read', () => {
    expect(reportLocalTags(repoWith(['v0.1.0', 'v0.2.0']))).toContain('2 local tags, none outside v<version>')
  })

  it('says zero rather than the same sentence when it read nothing', () => {
    expect(reportLocalTags(repoWith([]))).toContain('0 local tags, none outside v<version>')
  })

  it('does not report the same line for both', () => {
    expect(reportLocalTags(repoWith(['v0.1.0', 'v0.2.0']))).not.toBe(reportLocalTags(repoWith([])))
  })

  // A warning, never a failure — the non-blocking design is deliberate (#457),
  // and a tag on unmerged work can be its only reference.
  it('names a stray tag', () => {
    expect(reportLocalTags(repoWith(['v0.1.0', 'salvage/thing']))).toContain('salvage/thing')
  })

  // Reports and never fails (#457), so there is nothing to assert. The annotation
  // is what reaches the workflow run; the default reporter hides it on a pass.
  it('reports local tags a release would not push', { tags: ['check', 'release'] }, async ({ annotate }) => {
    const report = reportLocalTags()
    process.stdout.write(`${report}\n`)
    await annotate(report, report.startsWith('⚠️') ? 'warning' : 'notice')
  })
})
