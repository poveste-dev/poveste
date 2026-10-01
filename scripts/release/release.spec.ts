import { describe, expect, it } from 'vitest'
import { breakingIn, bumpProblem, selectReleaseTag, validateType } from './release.ts'

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

// The real bodies, trimmed: a changelog commit describes the rule in prose, and a
// release commit states it as a footer. A loose search for the words cannot tell
// them apart, and the first is what every patch release carries (#1099).
const MENTIONS_IT = {
  subject: 'docs(repo): write the 0.16.2 changelog section (#1070)',
  body: 'It is a `patch`: no commit in the range is a `feat`, none carries a `!`\nmarker or a `BREAKING CHANGE` footer.',
}
const CARRIES_IT = {
  subject: 'fix: raise the Node floor to 24.15.0 and drop Node 22 (#1089)',
  body: 'See #1075.\n\nBREAKING CHANGE: Node 22 is no longer supported.',
}
const ORDINARY = { subject: 'fix(ci): read the release body from poveste\'s half (#1073)', body: 'See #1071.' }

describe('breakingIn', () => {
  it('finds a BREAKING CHANGE footer', () => {
    expect(breakingIn([ORDINARY, CARRIES_IT])).toEqual([CARRIES_IT.subject])
  })

  it('does not read a commit that merely mentions the words as breaking', () => {
    expect(breakingIn([MENTIONS_IT])).toEqual([])
  })

  // commitlint refuses `fix!:` here, so a footer is how a live one is written —
  // but an older range or a revert can still carry the marker.
  it('finds a `!` marker in the subject', () => {
    expect(breakingIn([{ subject: 'refactor!: rename tailwind prefix htw- to ptw-', body: '' }]))
      .toHaveLength(1)
  })

  it('does not take a `!` anywhere else in the subject', () => {
    expect(breakingIn([{ subject: 'fix(app): stop shouting at the user!', body: '' }])).toEqual([])
  })
})

describe('bumpProblem', () => {
  it('refuses a patch when the range carries a breaking change', () => {
    const problem = bumpProblem('patch', '0.16.2', [ORDINARY, CARRIES_IT])

    expect(problem).toContain('too small')
    expect(problem).toContain(CARRIES_IT.subject)
  })

  it('allows the minor a breaking change belongs in', () => {
    expect(bumpProblem('minor', '0.16.2', [CARRIES_IT])).toBeUndefined()
  })

  it('allows a major, which is a separate declaration rather than this rule', () => {
    expect(bumpProblem('major', '0.16.2', [CARRIES_IT])).toBeUndefined()
  })

  it('reads an explicit version by whether the minor actually moves', () => {
    expect(bumpProblem('0.17.0', '0.16.2', [CARRIES_IT])).toBeUndefined()
    expect(bumpProblem('0.16.3', '0.16.2', [CARRIES_IT])).toContain('too small')
    expect(bumpProblem('1.0.0', '0.16.2', [CARRIES_IT])).toBeUndefined()
  })

  it('refuses the prerelease forms that do not raise the minor either', () => {
    expect(bumpProblem('prepatch', '0.16.2', [CARRIES_IT])).toContain('too small')
    expect(bumpProblem('prerelease', '0.16.2', [CARRIES_IT])).toContain('too small')
    expect(bumpProblem('preminor', '0.16.2', [CARRIES_IT])).toBeUndefined()
  })

  it('leaves a patch alone when nothing in the range breaks', () => {
    expect(bumpProblem('patch', '0.16.2', [ORDINARY, MENTIONS_IT])).toBeUndefined()
  })
})
