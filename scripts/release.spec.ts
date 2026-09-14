import { describe, expect, it } from 'vitest'
import { selectReleaseTag, validateType } from './release.ts'

describe('validateType', () => {
  it('accepts the release keywords', () => {
    expect(validateType('minor')).toBe('minor')
  })

  it('accepts an explicit version, which bumpp also takes', () => {
    expect(validateType('0.12.0')).toBe('0.12.0')
  })

  // The failure this replaces read as bumpp dropping to an interactive prompt,
  // because the type had landed where bumpp saw it as a filename (#457).
  it('rejects a missing type rather than prompting', () => {
    expect(() => validateType(undefined)).toThrow(/a release type is required/)
  })

  it('rejects a type that is neither keyword nor version', () => {
    expect(() => validateType('--release')).toThrow(/unknown release type/)
  })
})

describe('selectReleaseTag', () => {
  it('takes the tag bumpp put on the release commit', () => {
    expect(selectReleaseTag(['v0.12.0'], '0.12.0')).toBe('v0.12.0')
  })

  // Rather than rebuilding `v${version}`, which duplicates `tag: 'v%s'` in
  // bump.config.ts and pushes a non-existent ref the day that one is edited.
  it('does not assume the v prefix', () => {
    expect(selectReleaseTag(['release-0.12.0'], '0.12.0')).toBe('release-0.12.0')
  })

  it('ignores the empty string git prints when no tag points at HEAD', () => {
    expect(() => selectReleaseTag([''], '0.12.0')).toThrow(/no tag points at the release commit/)
  })

  it('picks the one naming the released version when an older tag shares the commit', () => {
    expect(selectReleaseTag(['v0.11.0', 'v0.12.0'], '0.12.0')).toBe('v0.12.0')
  })

  it('refuses to guess when two tags both name the version', () => {
    expect(() => selectReleaseTag(['v0.12.0', 'release-0.12.0'], '0.12.0'))
      .toThrow(/more than one tag points at the release commit/)
  })
})
