import type { PovesteConfig } from 'poveste'
import type { Plugin, UserConfig } from 'vite'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { clientConfig, VIRTUAL_IDS } from '@poveste/shared'
import { getDefaultConfig, loadConfigFile, mergeConfig, resolveConfigFile } from 'poveste'
import { VUE_SETUP_HOOK_NAMES } from '../setup-hooks.js'
import { projectVueVersion } from '../util/project-vue.js'
import { VAPOR_INTEROP_ID, vaporInteropModule } from '../util/vapor.js'

const EMPTY_SETUP_ID = '\0poveste-testing:empty-setup'
const CONFIG_RESOLVED_ID = `\0${VIRTUAL_IDS.config}`
const ENVIRONMENT_ID = 'virtual:$poveste-testing-environment'

// Vitest hands what it finds in `node_modules` to Node, which can't load the
// `virtual:` modules these packages import, so in a book that installs them no test
// ran (#1503). The workspace links them, and Vitest inlines a linked package.
const POVESTE_PACKAGES = [/\/node_modules\/poveste\//, /\/node_modules\/@poveste\//]

const EMPTY_SETUP = VUE_SETUP_HOOK_NAMES.map(name => `export const ${name} = undefined`).join('\n')

// `logEvent` from `poveste/client` reaches `@poveste/app`, which names these. A
// test never runs the code that reads them, but Vite's dependency scan follows
// the imports, and one it can't resolve skips pre-bundling and reloads the
// browser run partway through.
const INERT: Record<string, string> = {
  [VIRTUAL_IDS.markdownFiles]: 'export const markdownFiles = []\n',
  [VIRTUAL_IDS.componentDocs]: 'export const componentDocs = {}\n',
  [VIRTUAL_IDS.supportPluginsClient]: 'export const clientSupportPlugins = {}\n',
}

// Nuxt boots in `@nuxt/test-utils`' `beforeAll`, after Vitest has collected the
// tests, and a story's own setup can call a Nuxt composable while it is being
// collected. So its own `setupNuxt` runs before collection, into the promise that
// `beforeAll` awaits, and Nuxt boots once and in full. Both names are internal to
// `@nuxt/test-utils`: if a version renames them, the story tests fail loudly.
function nuxtEnvironment(setupNuxt: string) {
  return `import { tryUseNuxtApp } from '#app/nuxt'
import { setupNuxt } from ${JSON.stringify(setupNuxt)}

export async function environmentReady() {
  const win = window
  if (!win.__NUXT_VITEST_ENVIRONMENT__ || tryUseNuxtApp()) {
    return
  }
  win.__NUXT_VITEST_ENVIRONMENT_PROMISE__ ??= setupNuxt()
  await win.__NUXT_VITEST_ENVIRONMENT_PROMISE__
}

export function environmentApp() {
  return tryUseNuxtApp()?.vueApp
}
`
}

const NO_ENVIRONMENT = `export async function environmentReady() {}\nexport function environmentApp() {\n  return undefined\n}\n`

// `@nuxt/test-utils`' own boot, by file: its `exports` don't list it.
function setupNuxtFile(root: string): string | undefined {
  try {
    const file = join(dirname(createRequire(join(root, 'package.json')).resolve('@nuxt/test-utils/package.json')), 'dist/runtime/shared/nuxt.mjs')
    return existsSync(file) ? file : undefined
  }
  catch {
    return undefined
  }
}

// Root-relative, as `poveste dev` reads it: the docs write `/src/poveste.setup.ts`,
// which `resolve` takes as absolute, so pre-bundling scanned a file outside the
// book and the setup file's imports were found late, with a reload (#1507).
function setupFileOf(config: Partial<PovesteConfig>): string | undefined {
  const setupFile = config.setupFile
  const file = typeof setupFile === 'string' ? setupFile : setupFile && 'browser' in setupFile ? setupFile.browser : undefined
  return file?.replace(/^\/+/, '')
}

export interface PovesteTestingOptions {
  /** The book's poveste config file. Found from the Vite root by default. */
  configFile?: string
}

/**
 * What a story needs in the user's own Vitest to render as `poveste dev` renders
 * it: the book's setup file and the modules Poveste's client imports, with
 * Poveste's own packages inlined so Vitest can serve those, and `vue` and the
 * setup file pre-bundled for browser mode. Nothing else: no alias and no change
 * to how anything resolves, so the test sees the project's Vite config as the
 * project wrote it.
 *
 * Setup code that a plugin generates for `poveste dev`, such as the Nuxt app
 * `@poveste/plugin-nuxt` boots, is left to the test environment, which already
 * provides it: `@nuxt/test-utils`'s `nuxt` environment does in a Nuxt project.
 */
export function povesteTesting(options: PovesteTestingOptions = {}): Plugin {
  let root = process.cwd()
  let config: Partial<PovesteConfig> = {}

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

      // In browser mode Vite pre-bundles what its scan finds. It never sees `vue`,
      // which compiled templates and this package's own bundle import, nor the
      // setup file, which arrives as a virtual module. Each was bundled later,
      // with a reload partway through the first run, and two copies of Vue
      // failed it (#1503).
      const setupFile = setupFileOf(config)
      const optimizeDeps = {
        include: ['vue'],
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
      if (id === VAPOR_INTEROP_ID) {
        return `\0${VAPOR_INTEROP_ID}`
      }
      if (Object.hasOwn(INERT, id)) {
        return `\0${id}`
      }
      if (id === ENVIRONMENT_ID) {
        return `\0${ENVIRONMENT_ID}`
      }
      return undefined
    },

    // A story's `<docs>` block, which `poveste dev` renders as markdown. A test
    // renders the variants, not the docs, so it only has to import.
    transform(_code, id) {
      if (id.includes('?vue&type=docs')) {
        return 'export default () => {}'
      }
      return undefined
    },

    async load(id) {
      if (id === EMPTY_SETUP_ID) {
        return EMPTY_SETUP
      }
      if (id === CONFIG_RESOLVED_ID) {
        return `export const config = ${JSON.stringify(clientConfig({ ...getDefaultConfig(), ...config }))}\nexport const logos = {}\n`
      }
      if (id === `\0${VAPOR_INTEROP_ID}`) {
        return vaporInteropModule(projectVueVersion(root))
      }
      if (id.startsWith('\0') && Object.hasOwn(INERT, id.slice(1))) {
        return INERT[id.slice(1)]
      }
      // The app the test environment boots: Nuxt's, under `@nuxt/test-utils`' `nuxt`
      // environment. `poveste dev` renders a story inside the Nuxt app its plugin
      // boots, and a test does the same. Told by Nuxt's own `#app` alias and the
      // test utils being installed, not by `#imports`, which unimport also serves.
      if (id === `\0${ENVIRONMENT_ID}`) {
        const setupNuxt = setupNuxtFile(root)
        return setupNuxt && await this.resolve('#app/nuxt', resolve(root, 'index.html'))
          ? nuxtEnvironment(setupNuxt)
          : NO_ENVIRONMENT
      }
      return undefined
    },
  }
}
