import type { ViteDevServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { createModuleServer, isInternalRequest, matches, normalizeRequestId } from '../collect/module-server.js'

describe('normalizeRequestId', () => {
  it('strips the cache-busting query Vite appends', () => {
    // A transformed import arrives with `?v=` or `?t=`, and the module id the
    // runner caches under must not carry it, or nothing ever hits the cache.
    expect(normalizeRequestId('/src/Button.vue?v=abc123')).toBe('/src/Button.vue')
    expect(normalizeRequestId('/src/Button.vue?t=1699999')).toBe('/src/Button.vue')
    expect(normalizeRequestId('/src/Button.vue?import&v=abc')).toBe('/src/Button.vue')
  })

  it('unwraps the `/@id/` prefix, including the virtual-module null byte', () => {
    expect(normalizeRequestId('/@id/virtual:poveste-stories')).toBe('virtual:poveste-stories')
    expect(normalizeRequestId('/@id/__x00__virtual:story')).toBe('\0virtual:story')
  })

  it('takes a configured base off the front', () => {
    // A book served under a base writes its imports with it, and the module id
    // underneath does not have one.
    expect(normalizeRequestId('/docs/src/Button.vue', '/docs/')).toBe('/src/Button.vue')
    expect(normalizeRequestId('/src/Button.vue', '/')).toBe('/src/Button.vue')
  })

  it('leaves a plain id alone', () => {
    expect(normalizeRequestId('/src/Button.vue')).toBe('/src/Button.vue')
  })
})

describe('matches', () => {
  it('reads a string pattern as a package name under node_modules', () => {
    // This is what `viteNodeInlineDeps` is held against, so a bare name has to
    // mean the package rather than the substring.
    //
    // Written with forward slashes and no `join`: the id under test is one Vite
    // produced and `module-server.ts` builds its pattern with `pathe`, so both
    // sides are POSIX on every platform. A `node:path` join here passed locally
    // and failed on Windows, which is the test being wrong rather than the code.
    expect(matches('/repo/node_modules/vuetify/lib/index.mjs', ['vuetify'])).toBe(true)
    expect(matches('/repo/src/vuetify-theme.ts', ['vuetify'])).toBe(false)
  })

  it('reads the same id whatever separator the platform would use', () => {
    // `pathe` is what keeps this from depending on where it runs.
    expect(matches('D:/a/poveste/node_modules/vuetify/lib/index.mjs', ['vuetify'])).toBe(true)
  })

  it('reads a regular expression against the whole id', () => {
    expect(matches('/repo/node_modules/@tanstack/vue-virtual/dist/index.js', [/@tanstack/])).toBe(true)
    expect(matches('/repo/src/Button.vue', [/@tanstack/])).toBe(false)
  })

  it('matches nothing when nothing is configured', () => {
    expect(matches('/repo/node_modules/vuetify/lib/index.mjs', undefined)).toBe(false)
    expect(matches('/repo/node_modules/vuetify/lib/index.mjs', [])).toBe(false)
  })
})

describe('isInternalRequest', () => {
  it('names the two Vite client modules a collection worker must not load', () => {
    expect(isInternalRequest('/@vite/client')).toBe(true)
    expect(isInternalRequest('@vite/env')).toBe(true)
    expect(isInternalRequest('/@vite/other')).toBe(false)
    expect(isInternalRequest('/src/@vite/client')).toBe(false)
  })
})

/*
 * A server with one module and a module graph whose invalidation times the test
 * sets, the way Vite's clock does. That clock adds a millisecond for every call
 * within one, so after a burst of transforms it runs ahead of `Date.now()`.
 */
function serverWithOneModule(invalidatedAt: number) {
  const node = { lastHMRTimestamp: 0, lastInvalidationTimestamp: invalidatedAt }
  const transformRequest = vi.fn(async () => ({ code: 'export default 1', map: null }))
  const server = {
    config: { root: '/book', cacheDir: '/book/node_modules/.pvt-vite', base: '/', ssr: {} },
    moduleGraph: { getModuleById: () => node, getModulesByFile: () => new Set([node]) },
    pluginContainer: { resolveId: async () => null },
    transformRequest,
    ssrTransform: async (code: string) => ({ code, map: null }),
  } as unknown as ViteDevServer
  return { node, transformRequest, server }
}

const fetchAgain = (moduleServer: ReturnType<typeof createModuleServer>) => moduleServer.invoke('fetchModule', ['/src/a.ts', undefined, { cached: true }])

describe('a module fetched again in the same pass', () => {
  // Compared with `Date.now()`, a module invalidated "in the future" read as
  // stale on every fetch until the wall clock caught up, and each re-transform
  // pushed Vite's clock further ahead: one reload re-collected a large book a
  // hundred times over (#1352).
  it('is answered from the cache while Vite\'s clock runs ahead of the wall clock', async () => {
    const { transformRequest, server } = serverWithOneModule(Date.now() + 60_000)
    const moduleServer = createModuleServer(server, { inline: [] })

    await moduleServer.invoke('fetchModule', ['/src/a.ts', undefined, { cached: false }])
    const second = await fetchAgain(moduleServer)

    expect(second).toEqual({ cache: true })
    expect(transformRequest).toHaveBeenCalledTimes(1)
  })

  it('is transformed again once Vite invalidates it', async () => {
    const { node, transformRequest, server } = serverWithOneModule(Date.now() + 60_000)
    const moduleServer = createModuleServer(server, { inline: [] })

    await moduleServer.invoke('fetchModule', ['/src/a.ts', undefined, { cached: false }])
    node.lastInvalidationTimestamp += 1
    const second = await fetchAgain(moduleServer)

    expect(second).toMatchObject({ invalidate: true })
    expect(transformRequest).toHaveBeenCalledTimes(2)
  })
})
