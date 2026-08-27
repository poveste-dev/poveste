import { describe, expect, it } from 'vitest'
import { normalizeVersion, releasedVersions, sectionFor } from './check-changelog.ts'

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
