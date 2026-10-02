import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { breakingHeadingProblem, freezeWarning, headingSites, HISTOIRE_VERSIONS, normalizeVersion, placementProblems, releasedVersions, sectionFor, strayHeadings, subjectsAfter } from './changelog.ts'
import { tree } from './support/fixture-tree.ts'
import { runCheck } from './support/run-check.ts'

// The shape of the real file: newest release first, then older ones, then the
// inherited histoire history behind its own heading — which is `#`, not `##`.
// This fixture said `##` and that is why the boundary went untested for the only
// level the file actually uses (#1071).
const CHANGELOG = [
  '# Changelog',
  '',
  'Poveste\'s own releases are below, newest first.',
  '',
  '## v0.8.1',
  '',
  '**Three things that stopped a project working.**',
  '',
  '### 🩹 Fixes',
  '',
  '- Poveste builds inside Vike',
  '',
  '## v0.8.0',
  '',
  '- Something older',
  '',
  '# Inherited histoire changelog',
  '',
  '- Not ours',
].join('\n')

describe('sectionFor', () => {
  it('returns the release\'s own notes without repeating the version heading', () => {
    // The release is already titled with the version.
    expect(sectionFor(CHANGELOG, 'v0.8.1')).toBe([
      '**Three things that stopped a project working.**',
      '',
      '### 🩹 Fixes',
      '',
      '- Poveste builds inside Vike',
    ].join('\n'))
  })

  it('stops at the previous release rather than swallowing the rest of the file', () => {
    expect(sectionFor(CHANGELOG, 'v0.8.1')).not.toContain('Something older')
  })

  it('stops at the inherited histoire history', () => {
    expect(sectionFor(CHANGELOG, 'v0.8.0')).toBe('- Something older')
  })

  it('accepts a version written without the tag prefix', () => {
    expect(sectionFor(CHANGELOG, '0.8.0')).toBe('- Something older')
  })

  it('has nothing for a release that was never written up', () => {
    // #399: publishing this as the body would ship a release with no notes at
    // all, which is why the caller exits rather than continuing.
    expect(sectionFor(CHANGELOG, 'v0.9.0')).toBeUndefined()
  })

  it('treats a heading with no content under it as missing', () => {
    const drafted = '## v0.9.0\n\n## v0.8.1\n\n- Real notes'

    expect(sectionFor(drafted, 'v0.9.0')).toBeUndefined()
  })

  it('does not match a version that is only a prefix of a heading', () => {
    const changelog = '## v0.8.10\n\n- Ten\n'

    expect(sectionFor(changelog, 'v0.8.1')).toBeUndefined()
  })
})

/*
 * Poveste restarted at `0.1.0` and histoire's numbers run higher, so the file
 * holds two headings for most versions poveste can still cut. `sectionFor` took
 * the first and `release.yml` published it, which is another project's notes
 * emailed to every watcher with no way to resend (#1071).
 */
describe('a version written up in both halves of the file', () => {
  const BOTH_HALVES = [
    '# Changelog',
    '',
    '## v0.8.1',
    '',
    '- Ours',
    '',
    '# Inherited histoire changelog',
    '',
    '## v0.8.1',
    '',
    '- Histoire\'s, for the same version number',
  ].join('\n')

  it('takes poveste\'s own section rather than whichever comes first', () => {
    expect(sectionFor(BOTH_HALVES, 'v0.8.1')).toBe('- Ours')
  })

  it('has nothing when only the inherited half wrote it up', () => {
    const onlyInherited = '# Changelog\n\n## v0.9.0\n\n- Ours\n\n# Inherited histoire changelog\n\n## v0.17.17\n\n- Not ours\n'

    expect(sectionFor(onlyInherited, 'v0.17.17')).toBeUndefined()
  })

  it('says which half each heading is in', () => {
    expect(headingSites(BOTH_HALVES, 'v0.8.1')).toEqual({ poveste: [3], inherited: [9] })
  })

  it('reports a line number that points at the heading', () => {
    const { poveste, inherited } = headingSites(BOTH_HALVES, 'v0.8.1')
    const lines = BOTH_HALVES.split('\n')

    expect(lines[poveste[0]! - 1]).toBe('## v0.8.1')
    expect(lines[inherited[0]! - 1]).toBe('## v0.8.1')
  })

  it('refuses a duplicate inside poveste\'s own half, which nobody can resolve for the caller', () => {
    const twinned = '# Changelog\n\n## v0.9.0\n\n- One\n\n## v0.9.0\n\n- The other\n'

    expect(headingSites(twinned, 'v0.9.0').poveste).toEqual([3, 7])
    expect(sectionFor(twinned, 'v0.9.0')).toBeUndefined()
  })
})

/*
 * Against the real file, because the fixture above is the thing that was wrong:
 * it wrote the divider as `##` while the file writes it `#`, so the boundary was
 * only ever tested at a level the file does not use. Derive the version to ask
 * about from the file rather than naming one — `v0.1.0` is the oldest today and
 * that is not a durable fact.
 */
describe('the real CHANGELOG.md', () => {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const real = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8')
  const lines = real.split('\n')
  const divider = lines.findIndex(line => /^#+ +Inherited histoire changelog/.test(line))

  it('has the inherited divider this check has to recognise', () => {
    expect(divider, 'the file no longer has a divider, so the halves cannot be told apart').toBeGreaterThan(-1)
  })

  it('ends poveste\'s oldest section at the divider rather than swallowing it', () => {
    const oldest = [...lines.slice(0, divider).join('\n').matchAll(/^## (v\d\S*)\s*$/gm)].at(-1)?.[1]

    expect(oldest, 'no poveste release heading above the divider').toBeDefined()
    expect(sectionFor(real, oldest!)).not.toContain('Inherited histoire changelog')
  })

  // Per PR, because nothing else notices before the tag (#1104).
  it('has every section in the half it will be published from', () => {
    expect(placementProblems(real)).toEqual([])
  })

  it('pins exactly the versions histoire wrote below the divider', () => {
    const theirs = [...lines.slice(divider).join('\n').matchAll(/^## (v\d\S*)\s*$/gm)].map(match => match[1])

    expect(theirs).toEqual(HISTOIRE_VERSIONS)
  })

  it('does not answer with a histoire section for a version poveste has not written up', () => {
    const own = new Set([...lines.slice(0, divider).join('\n').matchAll(/^## (v\d\S*)\s*$/gm)].map(match => match[1]))
    const theirsOnly = [...lines.slice(divider).join('\n').matchAll(/^## (v\d\S*)\s*$/gm)]
      .map(match => match[1]!)
      .filter(version => !own.has(version))

    expect(theirsOnly.length, 'no histoire-only version left to test the collision with').toBeGreaterThan(0)
    for (const version of theirsOnly) {
      expect(sectionFor(real, version), `${version} is histoire's alone and must not be publishable`).toBeUndefined()
    }
  })
})

describe('placementProblems', () => {
  const file = (above: string[], below: string[]) => ['# Changelog', '', ...above, '# Inherited histoire changelog', '', ...below].join('\n')

  it('is silent on a file with each half holding its own', () => {
    const changelog = file(['## v0.18.0', '', 'Ours.', ''], ['## v0.17.0', '', 'Theirs.', ''])

    expect(placementProblems(changelog)).toEqual([])
  })

  it('names poveste\'s notes written under a version histoire also released, as 0.17.0\'s were', () => {
    const changelog = file(['## v0.16.2', '', 'Ours.', ''], ['## v0.17.0', '', 'Ours, misplaced.', '', '## v0.17.0', '', 'Theirs.', ''])

    expect(placementProblems(changelog)).toEqual([
      'lines 9 and 13: `## v0.17.0` appears 2 times in the inherited histoire half, below the divider at line 7. One is histoire\'s; poveste\'s notes for v0.17.0 belong above the divider.',
    ])
  })

  it('names a version histoire never released, which has no twin to collide with', () => {
    const changelog = file(['## v0.17.1', '', 'Ours.', ''], ['## v0.18.0', '', 'Ours, misplaced.', ''])

    expect(placementProblems(changelog)).toEqual([expect.stringMatching(/^line 9: `## v0\.18\.0` is in the inherited histoire half, below the divider at line 7, and histoire never released v0\.18\.0/)])
  })

  it('names both lines of a version poveste wrote up twice', () => {
    const changelog = file(['## v0.18.0', '', 'One.', '', '## v0.18.0', '', 'The other.', ''], [])

    expect(placementProblems(changelog)).toEqual([expect.stringMatching(/^lines 3 and 7: `## v0\.18\.0` appears 2 times in poveste's half/)])
  })

  it('names a heading with nothing under it', () => {
    const changelog = file(['## v0.18.0', '', '## v0.17.1', '', 'Ours.', ''], [])

    expect(placementProblems(changelog)).toEqual(['line 3: `## v0.18.0` has no notes under it, so there is nothing to publish.'])
  })

  it('ignores a heading inside a code sample', () => {
    const changelog = file(['## v0.18.0', '', '```md', '## v0.18.0', '```', ''], [])

    expect(placementProblems(changelog)).toEqual([])
  })
})

describe('breakingHeadingProblem', () => {
  const breaking = ['fix: raise the Node floor to 24.15.0 and drop Node 22 (#1089)']

  it('is silent when the range breaks nothing', () => {
    expect(breakingHeadingProblem('Notes.', 'v0.18.0', [])).toEqual([])
  })

  it('is silent when the section carries the heading', () => {
    expect(breakingHeadingProblem('Intro.\n\n### 🚨 Breaking Changes\n\n- Node 24.15.0', 'v0.18.0', breaking)).toEqual([])
  })

  it('names every breaking commit, and says the generated list will not add the heading', () => {
    const problem = breakingHeadingProblem('Intro.\n\n### 🩹 Fixes\n\n- Node 24.15.0', 'v0.18.0', breaking)

    expect(problem[0]).toBe('::error::v0.18.0 carries a breaking change, and its CHANGELOG.md section has no `### 🚨 Breaking Changes` heading')
    expect(problem).toContain(`  • ${breaking[0]}`)
    expect(problem.join('\n')).toContain('Nothing generated will add it')
  })

  it('does not take a heading inside a code sample for the real one', () => {
    expect(breakingHeadingProblem('```md\n### 🚨 Breaking Changes\n```', 'v0.18.0', breaking)).toHaveLength(5)
  })
})

// Both cases below silently truncated the published body// Both cases below silently truncated the published body// Both cases below silently truncated the published body, which is the one thing
// about a release that cannot be corrected once the notification is sent.
describe('a heading written inside a section', () => {
  const WITH_H2 = [
    '## v0.9.0',
    '',
    '- A real fix',
    '',
    '## Upgrading',
    '',
    '- Run `pnpm add poveste@0.9.0`',
    '',
    '## v0.8.1',
    '',
    '- older',
  ].join('\n')

  it('no longer ends the section, so the notes below it survive', () => {
    expect(sectionFor(WITH_H2, 'v0.9.0')).toContain('pnpm add poveste@0.9.0')
  })

  it('is reported, because `##` still reads as a new release', () => {
    expect(strayHeadings(WITH_H2, 'v0.9.0')).toEqual(['## Upgrading'])
  })
})

describe('a heading-like line inside a code sample', () => {
  const WITH_FENCE = [
    '## v0.9.0',
    '',
    '```sh',
    '## not a heading',
    '```',
    '',
    '- After the fence',
    '',
    '## v0.8.1',
    '',
    '- older',
  ].join('\n')

  it('does not end the section', () => {
    expect(sectionFor(WITH_FENCE, 'v0.9.0')).toContain('After the fence')
  })

  it('is not mistaken for a stray heading', () => {
    expect(strayHeadings(WITH_FENCE, 'v0.9.0')).toEqual([])
  })
})

describe('normalizeVersion', () => {
  it('leaves a tag name alone', () => {
    expect(normalizeVersion('v0.8.1')).toBe('v0.8.1')
  })

  it('adds the prefix a package.json version does not carry', () => {
    expect(normalizeVersion('0.8.1')).toBe('v0.8.1')
  })
})

describe('releasedVersions', () => {
  it('lists the releases newest first, and not the inherited history', () => {
    expect(releasedVersions(CHANGELOG)).toEqual(['v0.8.1', 'v0.8.0'])
  })
})

describe('subjectsAfter', () => {
  it('lists the subjects git reported', () => {
    expect(subjectsAfter('fix: one\nfeat: two\n')).toEqual(['fix: one', 'feat: two'])
  })

  it('is empty when nothing landed after the notes', () => {
    expect(subjectsAfter('')).toEqual([])
  })

  it('is empty when git could not answer, rather than reporting a blank commit', () => {
    expect(subjectsAfter('\n  \n')).toEqual([])
  })

  // It bumps the manifests and nothing else, so it always lands after the notes
  // commit — reporting it would make the warning fire on every release.
  it('drops the release commit, which always lands after the notes', () => {
    expect(subjectsAfter('chore: release v0.14.0\n')).toEqual([])
  })

  it('keeps real work that landed alongside it', () => {
    expect(subjectsAfter('fix: one\nchore: release v0.14.0\n')).toEqual(['fix: one'])
  })

  it('does not mistake a commit that merely mentions a release', () => {
    expect(subjectsAfter('docs(repo): write the v0.14.0 release notes\n')).toEqual(['docs(repo): write the v0.14.0 release notes'])
  })
})

describe('freezeWarning', () => {
  it('names every commit, since the reader has to judge each one', () => {
    const lines = freezeWarning(['fix: one', 'chore: two'])

    expect(lines.join('\n')).toContain('fix: one')
    expect(lines.join('\n')).toContain('chore: two')
  })

  it('says how to clear it, so the warning is not just an accusation', () => {
    expect(freezeWarning(['fix: one']).join('\n')).toContain('touching CHANGELOG.md')
  })

  it('agrees with itself about the count', () => {
    expect(freezeWarning(['fix: one'])[0]).toContain('1 commit landed')
    expect(freezeWarning(['a', 'b'])[0]).toContain('2 commits landed')
  })
})

// The failure exits live in `main()`, so a spec asserting only what the pure
// functions return stayed green with every `process.exit(1)` deleted (#760).
// The status is asserted over a tree where the check has to fail, with the
// message it prints and no stack trace: a crash exits non-zero too, and a guard
// that prints and then falls through to one looks the same from outside (#759).
// No passing case over the real file: between a version bump and its notes this
// check is meant to fail, and `test:scripts` would go red with it.
describe('the check as a process', () => {
  it('exits non-zero without a version to print', () => {
    const run = runCheck('checks/changelog.ts', [])

    expect(run).toMatchObject({ status: 1, stderr: expect.stringContaining('Usage: checks/changelog.ts <version>') })
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
  })

  it('exits non-zero when the changelog has no section for the version', () => {
    const run = runCheck('checks/changelog.ts', ['0.99.0', '--root', tree({ 'CHANGELOG.md': '# Changelog\n\n## v0.98.0\n\nOlder notes.\n' })])

    expect(run).toMatchObject({ status: 1, stderr: expect.stringContaining('has no section for') })
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
  })

  // #1071's acceptance. Before this the script exited 0 here and printed
  // histoire's section, which `release.yml` copies into the published body.
  it('exits non-zero for a version only the inherited half wrote up, and says so', () => {
    const changelog = '# Changelog\n\n## v0.98.0\n\nOurs.\n\n# Inherited histoire changelog\n\n## v0.99.0\n\nNot ours.\n'
    const run = runCheck('checks/changelog.ts', ['0.99.0', '--root', tree({ 'CHANGELOG.md': changelog })])

    expect(run).toMatchObject({ status: 1, stderr: expect.stringContaining('inherited histoire changelog') })
    expect(run.stdout, 'nothing publishable may reach stdout on a refusal').toBe('')
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
  })

  it('names both lines when poveste wrote the same version up twice', () => {
    const changelog = '# Changelog\n\n## v0.99.0\n\nOne.\n\n## v0.99.0\n\nThe other.\n'
    const run = runCheck('checks/changelog.ts', ['0.99.0', '--root', tree({ 'CHANGELOG.md': changelog })])

    expect(run).toMatchObject({ status: 1, stderr: expect.stringContaining('at lines 3 and 7') })
    expect(run.stdout).toBe('')
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
  })

  // A repository with one release behind it and a breaking fix since, which is
  // the shape #1103 asks about: the gate in `release.ts` counts the footer, and
  // nothing generated will say so in the notes.
  function repoWithBreakingFix(changelog: string, { tagged }: { tagged: boolean }): string {
    const root = tree({ 'CHANGELOG.md': changelog })
    const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], { cwd: root, stdio: 'ignore' })
    git('init', '-q')
    git('commit', '-q', '--allow-empty', '-m', 'feat: the first release')
    git('tag', 'v0.1.0')
    git('add', '-A')
    git('commit', '-q', '-m', 'fix: raise the floor\n\nBREAKING CHANGE: Node 24.15.0 or later.')
    if (tagged) {
      git('tag', 'v0.2.0')
    }
    return root
  }

  it('exits non-zero at the tag when a breaking release does not say so', () => {
    const root = repoWithBreakingFix('# Changelog\n\n## v0.2.0\n\n### 🩹 Fixes\n\n- The floor.\n', { tagged: true })
    const run = runCheck('checks/changelog.ts', ['0.2.0', '--root', root])

    expect(run).toMatchObject({ status: 1, stderr: expect.stringContaining('  • fix: raise the floor') })
    expect(run.stdout, 'nothing publishable may reach stdout on a refusal').toBe('')
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
  })

  it('exits non-zero before the tag as well, which is when the release skill runs it', () => {
    const root = repoWithBreakingFix('# Changelog\n\n## v0.2.0\n\n- The floor.\n', { tagged: false })

    expect(runCheck('checks/changelog.ts', ['0.2.0', '--root', root])).toMatchObject({ status: 1, stderr: expect.stringContaining('has no `### 🚨 Breaking Changes` heading') })
  })

  it('prints the section when a breaking release says so', () => {
    const root = repoWithBreakingFix('# Changelog\n\n## v0.2.0\n\n### 🚨 Breaking Changes\n\n- Node 24.15.0.\n', { tagged: true })

    expect(runCheck('checks/changelog.ts', ['0.2.0', '--root', root])).toMatchObject({ status: 0, stdout: expect.stringContaining('### 🚨 Breaking Changes') })
  })

  it('warns rather than passing in silence when git cannot read the range', () => {
    const run = runCheck('checks/changelog.ts', ['0.2.0', '--root', tree({ 'CHANGELOG.md': '# Changelog\n\n## v0.2.0\n\nNotes.\n' })])

    expect(run).toMatchObject({ status: 0, stderr: expect.stringContaining('nothing checked whether the section has to say it breaks') })
  })

  it('exits non-zero when a section carries a release-level heading', () => {
    const run = runCheck('checks/changelog.ts', ['0.99.0', '--root', tree({ 'CHANGELOG.md': '# Changelog\n\n## v0.99.0\n\nNotes.\n\n## Breaking changes\n\nMore.\n\n## v0.98.0\n\nOlder notes.\n' })])

    expect(run).toMatchObject({ status: 1, stderr: expect.stringContaining('contains a heading at the release level') })
    expect(run.stderr, 'the guard should end the run, not a crash after it').not.toContain('\n    at ')
  })
})
