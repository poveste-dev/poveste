import { describe, expect, it } from 'vitest'
import { freezeWarning, normalizeVersion, releasedVersions, sectionFor, strayHeadings, subjectsAfter } from './check-changelog.ts'

// The shape of the real file: newest release first, then older ones, then the
// inherited histoire history behind its own `## ` heading.
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
  '## Inherited histoire changelog',
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

// Both cases below silently truncated the published body, which is the one thing
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
