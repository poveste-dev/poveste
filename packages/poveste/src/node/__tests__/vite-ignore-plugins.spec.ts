import type { AddressInfo } from 'node:net'
import type { Plugin } from 'vite'
import { createServer as createNetServer } from 'node:net'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createServer } from '../server.js'
import { withoutIgnoredPlugins } from '../vite.js'

// Collection runs its worker from `dist`, which a spec importing `src` has not got.
vi.mock('../collect/index.js', () => ({
  useCollectStories: () => ({ clearCache: () => {}, executeStoryFile: async () => {}, destroy: async () => {} }),
}))

// Shaped like SvelteKit 3 (#1200): `vite.config.js` holds a plugin poveste ignores
// and one it keeps, which turns off the single-page fallback.
const FIXTURE = path.resolve(__dirname, './ignored-plugins')

describe('withoutIgnoredPlugins', () => {
  it('removes a plugin it names, inside a nested array as from a framework', async () => {
    const setup: Plugin = { name: 'setup' }

    const plugins = await withoutIgnoredPlugins([[{ name: 'compile' }, setup]], ['compile'])

    expect(plugins).toEqual([setup])
  })
})

describe('a book whose framework plugins poveste ignores', () => {
  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(FIXTURE)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads its vite config without the ignored plugin, so the book keeps an absolute base', async () => {
    const ctx = await createContext({ mode: 'build' })

    expect(ctx.resolvedViteConfig.base).toBe('/')
  })

  it('keeps the config of the plugins it does not ignore', async () => {
    const ctx = await createContext({ mode: 'build' })

    expect(ctx.resolvedViteConfig.resolve.alias).toEqual(expect.arrayContaining([expect.objectContaining({ find: '#fixture-alias' })]))
  })

  it('serves its own app at a story path in dev, though a plugin set `appType: custom`', async () => {
    const holder = createNetServer()
    await new Promise<void>(resolve => holder.listen(0, 'localhost', resolve))
    const { port } = holder.address() as AddressInfo
    await new Promise(resolve => holder.close(resolve))
    const { close } = await createServer(await createContext({ mode: 'dev' }), { port })

    try {
      const response = await fetch(`http://localhost:${port}/story/button`)
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toContain('<html')
    }
    finally {
      await close()
    }
  })
})
