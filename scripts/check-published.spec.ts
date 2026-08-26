import { describe, expect, it, vi } from 'vitest'
import { unpublishedReleases } from './check-published.ts'

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
