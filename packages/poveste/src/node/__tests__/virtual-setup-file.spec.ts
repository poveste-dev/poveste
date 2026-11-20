import { describe, expect, it } from 'vitest'
import { NOOP_ID, SETUP_ID } from '../virtual/index.js'
import { createVirtualFilesPlugin } from '../virtual/vite-plugin.js'

const ROOT = '/book'

async function resolveSetup(setupFile: unknown, { isServer = true, exists = false } = {}) {
  const plugin = createVirtualFilesPlugin({ root: ROOT, config: { setupFile } } as never, isServer)
  const context = { resolve: async (id: string) => exists ? { id } : null }
  return (plugin.resolveId as (this: unknown, id: string, importer?: string) => Promise<unknown>).call(context, SETUP_ID, undefined)
}

// A setup file that does not exist used to leave `virtual:$poveste-setup`
// unresolved, so the build failed on that id and named neither the file nor the
// key that points at it (#1702).
describe('the setup file the config names', () => {
  it('resolves to the file when it exists', async () => {
    await expect(resolveSetup('./src/poveste.setup.ts', { exists: true })).resolves.toEqual({ id: '/book/src/poveste.setup.ts' })
  })

  it('resolves to nothing when the config names none', async () => {
    await expect(resolveSetup(undefined)).resolves.toBe(NOOP_ID)
  })

  it('fails naming the key, the path as written and where it was looked for', async () => {
    const error = await resolveSetup('/src/poveste.setup.ts').catch(error => error as Error & { setupFile?: string })

    expect(error.message).toContain('`setupFile`')
    expect(error.message).toContain('/src/poveste.setup.ts')
    expect(error.message).toContain('/book/src/poveste.setup.ts')
    expect(error.message).toContain('remove')
    expect(error.message).not.toContain('virtual:')
    expect(error.setupFile).toBe('/book/src/poveste.setup.ts')
  })

  it('names the half of the object form that is missing', async () => {
    await expect(resolveSetup({ browser: './client.ts', server: './server.ts' })).rejects.toThrow('`setupFile.server`')
    await expect(resolveSetup({ browser: './client.ts', server: './server.ts' }, { isServer: false })).rejects.toThrow('`setupFile.browser`')
  })
})
