import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(async (_options: unknown) => ({ config: { plugins: [] } })),
}))

vi.mock('../context.js', () => ({ createContext: mocks.createContext }))
vi.mock('../preview.js', () => ({ startPreview: async () => ({ printUrls: () => {} }) }))

const { previewCommand } = await import('../commands/preview.js')

const BIN = path.resolve(__dirname, '../../../bin.mjs')

// `dev` and `build` took `--config` and `preview` did not. The CLI accepts an
// option it never declared, so `poveste preview --config other.config.ts` said
// nothing, read the default config, and served a directory with no book in it:
// every path answered 404 (#1302).
describe('poveste preview --config', () => {
  it('resolves the book from the config file it is given, as build does', async () => {
    await previewCommand({ config: 'poveste.other.config.ts', port: 4999 })

    expect(mocks.createContext).toHaveBeenCalledWith({ configFile: 'poveste.other.config.ts', mode: 'build' })
  })

  it('is an option the command declares', () => {
    const help = spawnSync(process.execPath, [BIN, 'preview', '--help'], { encoding: 'utf8' })

    expect(help.stdout).toContain('-c, --config')
  })
})
