import { describe, expect, it, vi } from 'vitest'
import { backoffMs, probeArgs, problemFor, tagArgs, tagFor, unpublishedReleases } from './check-published.ts'

const RELEASES = [
  { name: 'poveste', version: '0.7.0' },
  { name: '@poveste/plugin-vue', version: '0.7.0' },
]

// No real waiting, and no registry.
const options = (attempts = 3) => ({ attempts, waitMs: 0, sleep: () => {} })

describe('unpublishedReleases', () => {
  it('reports a release the registry does not have', () => {
    // The v0.7.0 failure: publish logged success, npm had nothing (#327).
    const probe = (name: string) => (name === '@poveste/plugin-vue' ? 'missing' : 'present')

    const problems = unpublishedReleases(RELEASES, probe, options())

    expect(problems).toEqual(['@poveste/plugin-vue@0.7.0 is not on the registry'])
  })

  it('passes when every release is on the registry', () => {
    const problems = unpublishedReleases(RELEASES, () => 'present', options())

    expect(problems).toEqual([])
  })

  it('names every missing release, so recovery is one operation', () => {
    const problems = unpublishedReleases(RELEASES, () => 'missing', options())

    expect(problems).toEqual([
      'poveste@0.7.0 is not on the registry',
      '@poveste/plugin-vue@0.7.0 is not on the registry',
    ])
  })

  it('accepts a release that only appears on a later attempt', () => {
    // Propagation, not a defect.
    const probe = vi.fn()
      .mockReturnValueOnce('present')
      .mockReturnValueOnce('missing')
      .mockReturnValue('present')

    const problems = unpublishedReleases(RELEASES, probe, options())

    expect(problems).toEqual([])
  })

  it('re-probes only what is still unaccounted for', () => {
    const probe = vi.fn()
      .mockReturnValueOnce('present')
      .mockReturnValueOnce('missing')
      .mockReturnValue('present')

    unpublishedReleases(RELEASES, probe, options())

    // Two on the first pass, then just the one that was missing.
    expect(probe.mock.calls.map(([name]) => name)).toEqual([
      'poveste',
      '@poveste/plugin-vue',
      '@poveste/plugin-vue',
    ])
  })

  it('separates an unverifiable answer from a confirmed absence', () => {
    const problems = unpublishedReleases(
      [RELEASES[0]],
      () => 'npm error network timeout',
      options(2),
    )

    expect(problems).toEqual(['poveste@0.7.0 could not be verified: npm error network timeout'])
  })
})

// The defaults are the guard, so these exercise them rather than an injected
// window: only `sleep` is replaced, and it records the simulated wait.
describe('the default retry window', () => {
  it('tolerates the propagation that failed a healthy v0.8.1', () => {
    // #401: the last package reached npm 60s after the check began.
    let waited = 0
    const probe = (name: string): string =>
      name === '@poveste/plugin-vue' && waited < 60_000 ? 'missing' : 'present'

    const problems = unpublishedReleases(RELEASES, probe, {
      sleep: (ms: number) => {
        waited += ms
      },
    })

    expect(problems).toEqual([])
  })

  it('still reports the gap it exists for', () => {
    // #327 was ten minutes and never resolved. Widening the window must not
    // turn this gate into one that waits out a real half-publish.
    let waited = 0
    const probe = (): string => (waited < 10 * 60_000 ? 'missing' : 'present')

    const problems = unpublishedReleases(RELEASES, probe, {
      sleep: (ms: number) => {
        waited += ms
      },
    })

    expect(problems).toHaveLength(2)
  })
})

describe('backoffMs', () => {
  it('waits the base interval before the second attempt', () => {
    expect(backoffMs(2, 6_000, 60_000)).toBe(6_000)
  })

  it('doubles the wait on each further attempt', () => {
    expect([3, 4, 5].map(attempt => backoffMs(attempt, 6_000, 60_000))).toEqual([12_000, 24_000, 48_000])
  })

  it('stops doubling at the ceiling', () => {
    expect(backoffMs(9, 6_000, 60_000)).toBe(60_000)
  })
})

describe('probeArgs', () => {
  it('asks the registry to revalidate, since the preflight cached it pre-publish', () => {
    // Without this the packument's 300s max-age hides a version published
    // seconds ago, and the gate fails a good release (#327).
    expect(probeArgs('poveste', '0.7.0')).toContain('--prefer-online')
  })

  it('asks for the exact released version', () => {
    expect(probeArgs('@poveste/plugin-vue', '0.7.0')).toEqual(
      ['view', '@poveste/plugin-vue@0.7.0', 'version', '--prefer-online'],
    )
  })
})

// The gate this half exists for: every tarball lands, no tag moves, and the
// release goes green while `starters.ts` — which asks for `latest` — still
// hands every reader the previous version (#427).
describe('the latest dist-tag', () => {
  it('reports a version that published but was never tagged', () => {
    const probe = (name: string) => (name === 'poveste' ? 'untagged:latest:0.6.1' : 'present')

    const problems = unpublishedReleases(RELEASES, probe, options())

    expect(problems).toEqual([
      'poveste@0.7.0 is on the registry, but the latest dist-tag still points at 0.6.1',
    ])
  })

  it('accepts a tag that only advances on a later attempt', () => {
    // Tag propagation, not a defect — the same backoff that absorbs a tarball's.
    const probe = vi.fn()
      .mockReturnValueOnce('untagged:latest:0.6.1')
      .mockReturnValue('present')

    expect(unpublishedReleases(RELEASES, probe, options())).toEqual([])
  })

  it('says so when a package has no latest tag at all', () => {
    const problems = unpublishedReleases([RELEASES[0]], () => 'untagged:latest:nothing', options())

    expect(problems).toEqual([
      'poveste@0.7.0 is on the registry, but the latest dist-tag still points at nothing',
    ])
  })

  it('asks the registry for the tag, with revalidation', () => {
    expect(tagArgs('@poveste/plugin-vue', '0.12.0')).toEqual([
      'view',
      '@poveste/plugin-vue',
      'dist-tags.latest',
      '--prefer-online',
    ])
  })
})

describe('problemFor', () => {
  it('keeps a missing tarball and an unmoved tag distinguishable', () => {
    expect(problemFor('missing')).toBe('is not on the registry')
    expect(problemFor('untagged:latest:0.6.1')).toBe('is on the registry, but the latest dist-tag still points at 0.6.1')
  })

  it('passes an unknown answer through as the reason', () => {
    expect(problemFor('npm error code E500')).toBe('could not be verified: npm error code E500')
  })
})

describe('tagFor', () => {
  // `release.yml` publishes a prerelease to `next` so it cannot move `latest`
  // out from under `npm i poveste` (#553). The check asserts the same tag the
  // publish used, or it is testing a different release than the one that ran.
  it('sends a prerelease to next', () => {
    expect(tagFor('0.12.0-beta.1')).toBe('next')
    expect(tagArgs('poveste', '0.12.0-rc.0')[2]).toBe('dist-tags.next')
  })

  it('sends everything else to latest', () => {
    expect(tagFor('0.12.0')).toBe('latest')
    expect(tagArgs('poveste', '0.12.0')[2]).toBe('dist-tags.latest')
  })
})

describe('a prerelease', () => {
  it('is held to its own tag, and the message names which', () => {
    const problems = unpublishedReleases(
      [{ name: 'poveste', version: '0.12.0-beta.1' }],
      () => 'untagged:next:0.11.0-beta.9',
      options(),
    )

    expect(problems).toEqual([
      'poveste@0.12.0-beta.1 is on the registry, but the next dist-tag still points at 0.11.0-beta.9',
    ])
  })
})

describe('problemFor, on a tag that could not be read', () => {
  // The shared catch used to attribute a failed tag read to the version probe
  // and report a published package as missing, which sends whoever is
  // recovering to re-run the publish — the one move this file warns against.
  it('does not read as a missing tarball', () => {
    expect(problemFor('the latest dist-tag could not be read: npm error code E500'))
      .toBe('could not be verified: the latest dist-tag could not be read: npm error code E500')
  })
})
