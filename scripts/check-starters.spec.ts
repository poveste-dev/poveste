import { describe, expect, it } from 'vitest'
import { installArgs, mergeResults } from './check-starters.ts'

const result = (framework: string, ok: boolean) => ({ framework, ok, detail: ok ? 'resolves' : 'ERESOLVE' } as any)

describe('installArgs', () => {
  it('revalidates after a publish, so `latest` is not the previous release', () => {
    // The packument caches for 300s; a stale one would install the version
    // before the one this step exists to vouch for, and pass (#298).
    expect(installArgs(true)).toContain('--prefer-online')
  })

  it('leaves the cron run on npm defaults, where nothing has just changed', () => {
    expect(installArgs(false)).not.toContain('--prefer-online')
  })
})

describe('mergeResults', () => {
  it('keeps a starter that resolved, so a late blip cannot undo it', () => {
    const previous = [result('vue', true), result('svelte', false)]

    const merged = mergeResults(previous, [result('svelte', true)])

    expect(merged.map(r => [r.framework, r.ok])).toEqual([['vue', true], ['svelte', true]])
  })

  it('records a retried starter that failed again', () => {
    const previous = [result('vue', true), result('nuxt', false)]

    const merged = mergeResults(previous, [result('nuxt', false)])

    expect(merged.find(r => r.framework === 'nuxt')!.ok).toBe(false)
  })

  it('preserves order, so the summary reads the same every round', () => {
    const previous = [result('vue', false), result('nuxt', false), result('svelte', false)]

    const merged = mergeResults(previous, [result('svelte', true), result('vue', true)])

    expect(merged.map(r => r.framework)).toEqual(['vue', 'nuxt', 'svelte'])
  })
})
