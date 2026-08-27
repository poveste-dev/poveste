import { describe, expect, it, vi } from 'vitest'
import { backoffMs, probeArgs, unpublishedReleases } from './check-published.ts'

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
