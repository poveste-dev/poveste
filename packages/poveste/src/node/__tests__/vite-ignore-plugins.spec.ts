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
// by name and one it keeps without its server hooks.
const FIXTURE = path.resolve(__dirname, './ignored-plugins')

describe('withoutIgnoredPlugins', () => {
  const setup: Plugin = { name: 'setup', config: () => ({}), configureServer: () => {} }

  it('removes a plugin it names, inside a nested array as from a framework', async () => {
    const plugins = await withoutIgnoredPlugins([[{ name: 'compile' }, setup]], ['compile'])

    expect(plugins).toEqual([setup])
  })

  it('keeps a plugin named with hooks, without those hooks, and leaves the original whole', async () => {
    const [kept] = await withoutIgnoredPlugins([setup], [{ name: 'setup', hooks: ['configureServer'] }]) as Plugin[]

    expect(Object.keys(kept!)).toEqual(['name', 'config'])
    expect(setup.configureServer).toBeTypeOf('function')
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

  it('keeps the config of a plugin it only takes hooks from', async () => {
    const ctx = await createContext({ mode: 'build' })

    expect(ctx.resolvedViteConfig.resolve.alias).toEqual(expect.arrayContaining([expect.objectContaining({ find: '#fixture-alias' })]))
  })

  it('serves its own app at a story path in dev, not the framework\'s', async () => {
    const holder = createNetServer()
    await new Promise<void>(resolve => holder.listen(0, 'localhost', resolve))
    const { port } = holder.address() as AddressInfo
    await new Promise(resolve => holder.close(resolve))
    const { close } = await createServer(await createContext({ mode: 'dev' }), { port })

    try {
      const response = await fetch(`http://localhost:${port}/story/button`)
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).not.toContain('the framework app')
      expect(body).toContain('<html')
    }
    finally {
      await close()
    }
  })
})
