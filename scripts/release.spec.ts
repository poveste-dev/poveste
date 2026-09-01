import { describe, expect, it } from 'vitest'
import { strayTags } from './check-local-tags.ts'
import { tagFor, validateType } from './release.ts'

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

describe('tagFor', () => {
  it('names the tag the release workflow triggers on', () => {
    expect(tagFor('0.12.0')).toBe('v0.12.0')
  })
})

describe('strayTags', () => {
  it('is silent when every tag is a release tag', () => {
    expect(strayTags(['v0.10.0', 'v0.11.0'])).toEqual([])
  })

  // The tag that actually leaked when v0.10.0 was cut (#457).
  it('names a private tag parked on the machine', () => {
    expect(strayTags(['v0.10.0', 'salvage/amazing-cerf-61cd4c'])).toEqual(['salvage/amazing-cerf-61cd4c'])
  })

  it('ignores the empty string git prints for a repository with no tags', () => {
    expect(strayTags([''])).toEqual([])
  })

  it('does not treat a prerelease tag as stray', () => {
    expect(strayTags(['v0.12.0-beta.1'])).toEqual([])
  })
})
