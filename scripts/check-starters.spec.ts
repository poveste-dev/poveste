import { describe, expect, it } from 'vitest'
import { installArgs, isPovestePackage, mergeResults, pinLatest, releasedVersion } from './check-starters.ts'

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

// #411: during a publish `latest` is still the previous release, so this step
// could resolve the old version and report the new one green.
describe('pinLatest', () => {
  const manifest = {
    name: 'poveste-vue-starter',
    private: true as const,
    type: 'module' as const,
    scripts: { dev: 'poveste dev' },
    dependencies: { vue: '^3.5.26' },
    devDependencies: { 'poveste': 'latest', '@poveste/plugin-vue': 'latest', 'vite': '^8.0.0' },
  }

  it('asks for the version being released instead of the moving tag', () => {
    expect(pinLatest(manifest, '0.8.1').devDependencies).toEqual({
      'poveste': '0.8.1',
      '@poveste/plugin-vue': '0.8.1',
      'vite': '^8.0.0',
    })
  })

  it('leaves every pinned range alone', () => {
    expect(pinLatest(manifest, '0.8.1').dependencies).toEqual({ vue: '^3.5.26' })
  })

  it('does not hand the poveste version to somebody else\'s `latest`', () => {
    // A starter asking for `typescript: latest` would otherwise be resolved as
    // `typescript@0.8.1`, failing a healthy release over a package nobody touched.
    const withForeignLatest = {
      ...manifest,
      devDependencies: { ...manifest.devDependencies, typescript: 'latest' },
    }

    expect(pinLatest(withForeignLatest, '0.8.1').devDependencies.typescript).toBe('latest')
  })

  it('does not touch anything outside the dependency maps', () => {
    const pinned = pinLatest(manifest, '0.8.1')

    expect(pinned.name).toBe('poveste-vue-starter')
    expect(pinned.scripts).toEqual({ dev: 'poveste dev' })
  })

  it('leaves the original manifest untouched, since the starters are shared', () => {
    pinLatest(manifest, '0.8.1')

    expect(manifest.devDependencies.poveste).toBe('latest')
  })
})

describe('releasedVersion', () => {
  it('is the workspace version, which is the tag being cut', () => {
    expect(releasedVersion()).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe('isPovestePackage', () => {
  it('claims the CLI and the scope', () => {
    expect(['poveste', '@poveste/plugin-vue'].map(isPovestePackage)).toEqual([true, true])
  })

  it('leaves everything else alone', () => {
    expect(['typescript', 'vue', 'histoire', '@histoire/plugin-vue'].map(isPovestePackage))
      .toEqual([false, false, false, false])
  })
})
