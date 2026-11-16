import type { PovesteConfig } from '@poveste/shared'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VIRTUAL_IDS } from '@poveste/shared'
import { afterAll, describe, expect, it } from 'vitest'
import { povesteTestingPlugin } from '../testing.js'
import { tempDir } from './temp-dir.js'

const dir = tempDir(join(tmpdir(), 'poveste-testing-setup-'))
const root = join(dir.path, 'book')
// Outside the book, as a plugin's own file is: `HstQuasar()` names one in its package.
const pluginSetup = join(dir.path, 'plugin', 'default-setup.js')
const ownSetup = join(root, 'src', 'setup.ts')

for (const file of [pluginSetup, ownSetup]) {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, 'export {}\n')
}

afterAll(() => {
  dir.remove()
})

/** `HstQuasar()`'s hook, which names its own setup file when the book names none. */
const defaultSetupPlugin = {
  name: 'default-setup',
  config: (config: PovesteConfig) => config.setupFile ? undefined : { setupFile: pluginSetup },
}

async function setupFileFor(poveste: Partial<PovesteConfig>) {
  const plugin = povesteTestingPlugin({ setupHookNames: ['setupVue'], include: [] })
  await (plugin.config as (user: object) => Promise<unknown>)({ root, poveste })
  const context = { resolve: async (id: string) => existsSync(id) ? { id } : null }
  return (plugin.resolveId as (this: typeof context, id: string, importer: string) => Promise<unknown>)
    .call(context, VIRTUAL_IDS.setup, join(root, 'src', 'Button.story.test.ts'))
}

describe('the setup file a story test loads', () => {
  // `poveste dev` runs each plugin's `config` hook, and story tests did not, so a
  // Quasar book with no setup file had no Quasar installed under them (#1664).
  it('is the one a plugin names for a book that names none', async () => {
    expect(await setupFileFor({ plugins: [defaultSetupPlugin] })).toEqual({ id: pluginSetup })
  })

  it('is the book\'s own when it names one, root-relative as the docs write it', async () => {
    expect(await setupFileFor({ setupFile: '/src/setup.ts', plugins: [defaultSetupPlugin] })).toEqual({ id: ownSetup })
  })
})
