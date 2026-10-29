import type { PovesteConfig } from '@poveste/shared'
import type { Plugin, UserConfig } from 'vite'
import { relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { clientConfig, VIRTUAL_IDS } from '@poveste/shared'
import { getDefaultConfig, loadConfigFile, mergeConfig, resolveConfigFile } from './config.js'

const EMPTY_SETUP_ID = '\0poveste-testing:empty-setup'
const CONFIG_RESOLVED_ID = `\0${VIRTUAL_IDS.config}`

// Vitest hands what it finds in `node_modules` to Node, which can't load the
// `virtual:` modules these packages import, so in a book that installs them no test
// ran (#1503). The workspace links them, and Vitest inlines a linked package.
const POVESTE_PACKAGES = [/\/node_modules\/poveste\//, /\/node_modules\/@poveste\//]

// `logEvent` from `poveste/client` reaches `@poveste/app`, which names these. A
// test never runs the code that reads them, but Vite's dependency scan follows
// the imports, and one it can't resolve skips pre-bundling and reloads the
// browser run partway through.
const INERT: Record<string, string> = {
  [VIRTUAL_IDS.markdownFiles]: 'export const markdownFiles = []\n',
  [VIRTUAL_IDS.componentDocs]: 'export const componentDocs = {}\n',
  [VIRTUAL_IDS.supportPluginsClient]: 'export const clientSupportPlugins = {}\n',
}

// Root-relative, as `poveste dev` reads it: the docs write `/src/poveste.setup.ts`,
// which `resolve` takes as absolute, so pre-bundling scanned a file outside the
// book and the setup file's imports were found late, with a reload (#1507).
function setupFileOf(config: Partial<PovesteConfig>): string | undefined {
  const setupFile = config.setupFile
  const file = typeof setupFile === 'string' ? setupFile : setupFile && 'browser' in setupFile ? setupFile.browser : undefined
  return file?.replace(/^\/+/, '')
}

export interface PovesteTestingPluginOptions {
  /** The book's poveste config file. Found from the Vite root by default. */
  configFile?: string
  /** The hooks a setup file can export for this framework, each stubbed when the book has none. */
  setupHookNames: readonly string[]
  /**
   * Pre-bundled before the first test in browser mode: what compiled stories and
   * the framework plugin's own client import, which Vite's scan of the test files
   * never reaches.
   */
  include: string[]
}

/**
 * What a story needs in the user's own Vitest to render as `poveste dev` renders
 * it, for any framework: the book's setup file and the modules Poveste's client
 * imports, with Poveste's own packages inlined so Vitest can serve those, and the
 * framework's runtime and the setup file pre-bundled for browser mode. Nothing
 * else: no alias and no change to how anything resolves, so the test sees the
 * project's Vite config as the project wrote it. Each framework plugin's
 * `povesteTesting()` is this, with its own hook names.
 */
export function povesteTestingPlugin(options: PovesteTestingPluginOptions): Plugin {
  let root = process.cwd()
  let config: Partial<PovesteConfig> = {}
  const emptySetup = options.setupHookNames.map(name => `export const ${name} = undefined`).join('\n')

  return {
    name: 'poveste:testing',

    async config(user) {
      root = resolve(user.root ?? process.cwd())
      const file = options.configFile ? resolve(root, options.configFile) : resolveConfigFile(root)
      const fromFile = file ? await loadConfigFile(file) : {}
      // As `poveste dev` reads it: the config file, then the Vite config's key.
      const fromVite = ((user as { poveste?: unknown, histoire?: unknown }).poveste
        ?? (user as { histoire?: unknown }).histoire ?? {}) as Partial<PovesteConfig>
      config = mergeConfig(fromFile, fromVite) as Partial<PovesteConfig>

      // In browser mode Vite pre-bundles what its scan finds. It never sees the
      // framework's runtime, which compiled stories and the plugin's own bundle
      // import, nor the setup file, which arrives as a virtual module. Each was
      // bundled later, with a reload partway through the first run, and two
      // copies of Vue failed it (#1503).
      const setupFile = setupFileOf(config)
      const optimizeDeps = {
        include: options.include,
        ...setupFile ? { entries: [relative(root, resolve(root, setupFile)).split(sep).join('/')] } : {},
      }
      // `true` already inlines everything, and an array merged into it would not.
      if ((user as { test?: { server?: { deps?: { inline?: unknown } } } }).test?.server?.deps?.inline === true) {
        return { optimizeDeps }
      }
      return { optimizeDeps, test: { server: { deps: { inline: POVESTE_PACKAGES } } } } as UserConfig
    },

    configResolved(resolved) {
      root = resolved.root
    },

    async resolveId(id, importer) {
      if (id === VIRTUAL_IDS.setup) {
        const file = setupFileOf(config)
        if (file) {
          return this.resolve(resolve(root, file), importer, { skipSelf: true })
        }
        return EMPTY_SETUP_ID
      }
      if (id === VIRTUAL_IDS.generatedGlobalSetup) {
        return EMPTY_SETUP_ID
      }
      if (id === VIRTUAL_IDS.config) {
        return CONFIG_RESOLVED_ID
      }
      if (Object.hasOwn(INERT, id)) {
        return `\0${id}`
      }
      return undefined
    },

    load(id) {
      if (id === EMPTY_SETUP_ID) {
        return emptySetup
      }
      if (id === CONFIG_RESOLVED_ID) {
        return `export const config = ${JSON.stringify(clientConfig({ ...getDefaultConfig(), ...config }))}\nexport const logos = {}\n`
      }
      if (id.startsWith('\0') && Object.hasOwn(INERT, id.slice(1))) {
        return INERT[id.slice(1)]
      }
      return undefined
    },
  }
}
