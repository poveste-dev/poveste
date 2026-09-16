import { describe, expect, it } from 'vitest'
import { pushedTags, refusal } from './pre-push-tags.ts'

const ZERO = '0000000000000000000000000000000000000000'
const SHA = '4c2e9f1a77b0d3e5c8a1f6b2d9e4c7a0b3f5d8e1'

describe('pushedTags', () => {
  it('names the tag a release push carries alongside the branch', () => {
    const stdin = [
      `refs/heads/main ${SHA} refs/heads/main ${ZERO}`,
      `refs/tags/v0.14.0 ${SHA} refs/tags/v0.14.0 ${ZERO}`,
    ].join('\n')

    expect(pushedTags(stdin)).toEqual(['v0.14.0'])
  })

  it('returns nothing when the push carries branches only', () => {
    const stdin = `refs/heads/fix/18-pre-commit ${SHA} refs/heads/fix/18-pre-commit ${ZERO}`

    expect(pushedTags(stdin)).toEqual([])
  })

  it('ignores a tag deletion, which names the tag in the remote field', () => {
    const stdin = `(delete) ${ZERO} refs/tags/salvage/amazing-cerf-61cd4c ${SHA}`

    expect(pushedTags(stdin)).toEqual([])
  })

  it('keeps a slash in a tag name', () => {
    const stdin = `refs/tags/salvage/amazing-cerf-61cd4c ${SHA} refs/tags/salvage/amazing-cerf-61cd4c ${ZERO}`

    expect(pushedTags(stdin)).toEqual(['salvage/amazing-cerf-61cd4c'])
  })
})

describe('refusal', () => {
  it('allows a push of one release tag', () => {
    expect(refusal(['v0.14.0'])).toBeUndefined()
  })

  it('allows a push carrying no tag at all', () => {
    expect(refusal([])).toBeUndefined()
  })

  it('names the stray tag and the override', () => {
    const message = refusal(['salvage/amazing-cerf-61cd4c'])

    expect(message).toContain('• salvage/amazing-cerf-61cd4c')
    expect(message).toContain('git push --no-verify')
  })

  it('refuses a stray tag travelling with a release tag', () => {
    expect(refusal(['v0.14.0', 'salvage/amazing-cerf-61cd4c'])).toContain('1 tag in this push is not named')
  })

  it('counts more than one stray tag', () => {
    expect(refusal(['salvage/one', 'wip/two'])).toContain('2 tags in this push are not named')
  })

  it('does not name the release tag it travelled with', () => {
    expect(refusal(['v0.14.0', 'salvage/amazing-cerf-61cd4c'])).not.toContain('• v0.14.0')
  })
})
