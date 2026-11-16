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

// A story's hosts run on the vendored Vue in every framework, which in browser mode
// is its esm-bundler build, and that warns once per test file about any flag not
// defined, in a React book too (#1570). `@vitejs/plugin-vue`'s values, which a Vue
// book gets anyway. Under jsdom Node loads Vue's CommonJS build, which has no flags.
const VUE_FEATURE_FLAGS: Record<string, string> = {
  __VUE_OPTIONS_API__: 'true',
  __VUE_PROD_DEVTOOLS__: 'false',
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
}

// Root-relative, as `poveste dev` reads it: the docs write `/src/poveste.setup.ts`,
// which `resolve` takes as absolute, so pre-bundling scanned a file outside the
// book and the setup file's imports were found late, with a reload (#1507).
function setupFileOf(config: Partial<PovesteConfig>): string | undefined {
  const setupFile = config.setupFile
  const file = typeof setupFile === 'string' ? setupFile : setupFile && 'browser' in setupFile ? setupFile.browser : undefined
  return file?.replace(/^\/+/, '')
}

/** The part of Vitest's `configureVitest` context this uses, typed here so the package does not depend on Vitest. */
interface VitestContext {
  defineCacheKeyGenerator?: (generator: () => string) => void
  /** The same, by the name it had before it was stable. */
  experimental_defineCacheKeyGenerator?: (generator: () => string) => void
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
 * imports, with Poveste's own packages inlined so Vitest can serve those, the
 * framework's runtime and the setup file pre-bundled for browser mode, and Vue's
 * feature flags defined. Nothing else: no alias and no change to how anything
 * resolves, so the test sees the project's Vite config as the project wrote it.
 * Each framework plugin's `povesteTesting()` is this, with its own hook names.
 */
export function povesteTestingPlugin(options: PovesteTestingPluginOptions): Plugin {
  let root = process.cwd()
  let config: Partial<PovesteConfig> = {}
  const emptySetup = options.setupHookNames.map(name => `export const ${name} = undefined`).join('\n')

  const plugin: Plugin & { configureVitest: (context: VitestContext) => void } = {
    name: 'poveste:testing',

    // Vitest keeps transformed modules on disk across runs, keyed on its own config
    // files, so a setup file named or changed in the poveste config went unseen
    // while the cached import of the previous one ran (#1663).
    configureVitest(context) {
      const define = context.defineCacheKeyGenerator ?? context.experimental_defineCacheKeyGenerator
      define?.(() => `poveste-setup:${setupFileOf(config) ?? ''}`)
    },

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
      // A book's own value stands, since a plugin's config is merged over what it was given.
      const define = Object.fromEntries(Object.entries(VUE_FEATURE_FLAGS).map(([flag, value]) => [flag, user.define?.[flag] ?? value]))
      // `true` already inlines everything, and an array merged into it would not.
      if ((user as { test?: { server?: { deps?: { inline?: unknown } } } }).test?.server?.deps?.inline === true) {
        return { define, optimizeDeps }
      }
      return { define, optimizeDeps, test: { server: { deps: { inline: POVESTE_PACKAGES } } } } as UserConfig
    },

    configResolved(resolved) {
      root = resolved.root
    },

    async resolveId(id, importer) {
      if (id === VIRTUAL_IDS.setup) {
        const file = setupFileOf(config)
        if (file) {
          const resolved = await this.resolve(resolve(root, file), importer, { skipSelf: true })
          if (!resolved) {
            this.error(`Cannot find the setup file '${file}' named in the Poveste config: nothing at ${resolve(root, file)}.`)
          }
          return resolved
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
  return plugin
}
