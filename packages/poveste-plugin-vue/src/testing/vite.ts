import type { PovesteConfig } from 'poveste'
import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { getDefaultConfig, loadConfigFile, mergeConfig, resolveConfigFile } from 'poveste'
import { VUE_SETUP_HOOK_NAMES } from '../setup-hooks.js'
import { projectVueVersion } from '../util/project-vue.js'
import { VAPOR_INTEROP_ID, vaporInteropModule } from '../util/vapor.js'

const SETUP_ID = 'virtual:$poveste-setup'
const GENERATED_GLOBAL_SETUP_ID = 'virtual:$poveste-generated-global-setup'
const CONFIG_ID = 'virtual:$poveste-config'
const EMPTY_SETUP_ID = '\0poveste-testing:empty-setup'
const CONFIG_RESOLVED_ID = `\0${CONFIG_ID}`
const ENVIRONMENT_ID = 'virtual:$poveste-testing-environment'

const EMPTY_SETUP = VUE_SETUP_HOOK_NAMES.map(name => `export const ${name} = undefined`).join('\n')

// `logEvent` from `poveste/client` reaches `@poveste/app`, which names these. A
// test never runs the code that reads them, but Vite's dependency scan follows
// the imports, and one it can't resolve skips pre-bundling and reloads the
// browser run partway through.
const INERT: Record<string, string> = {
  'virtual:$poveste-markdown-files': 'export const markdownFiles = []\n',
  'virtual:$poveste-component-docs': 'export const componentDocs = {}\n',
  'virtual:$poveste-support-plugins-client': 'export const clientSupportPlugins = {}\n',
}

// Nuxt boots in `@nuxt/test-utils`' `beforeAll`, after Vitest has collected the
// tests, and a story's own setup can call a Nuxt composable while it is being
// collected. So it boots before collection, through the same entry and into the
// same promise that `beforeAll` awaits, and Nuxt still boots once.
const NUXT_ENVIRONMENT = `import { tryUseNuxtApp } from '#imports'

export async function environmentReady() {
  const win = window
  if (!win.__NUXT_VITEST_ENVIRONMENT__ || tryUseNuxtApp()) {
    return
  }
  win.__NUXT_VITEST_ENVIRONMENT_PROMISE__ ??= import('#app/nuxt-vitest-app-entry').then(entry => entry.default())
  await win.__NUXT_VITEST_ENVIRONMENT_PROMISE__
}

export function environmentApp() {
  return tryUseNuxtApp()?.vueApp
}
`

export interface PovesteTestingOptions {
  /** The book's poveste config file. Found from the Vite root by default. */
  configFile?: string
}

/**
 * What a story needs in the user's own Vitest to render as `poveste dev` renders
 * it: the book's setup file and the modules Poveste's client imports. Nothing
 * else: no alias, no `optimizeDeps` entry and no change to how anything
 * resolves, so the test sees the project's Vite config as the project wrote it.
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

    async configResolved(resolved) {
      root = resolved.root
      const file = options.configFile ? resolve(root, options.configFile) : resolveConfigFile(root)
      const fromFile = file ? await loadConfigFile(file) : {}
      // As `poveste dev` reads it: the config file, then the Vite config's key.
      const fromVite = ((resolved as { poveste?: unknown, histoire?: unknown }).poveste
        ?? (resolved as { histoire?: unknown }).histoire ?? {}) as Partial<PovesteConfig>
      config = mergeConfig(fromFile, fromVite) as Partial<PovesteConfig>
    },

    async resolveId(id, importer) {
      if (id === SETUP_ID) {
        const setupFile = config.setupFile
        const file = typeof setupFile === 'string' ? setupFile : setupFile && 'browser' in setupFile ? setupFile.browser : undefined
        if (file) {
          return this.resolve(resolve(root, file), importer, { skipSelf: true })
        }
        return EMPTY_SETUP_ID
      }
      if (id === GENERATED_GLOBAL_SETUP_ID) {
        return EMPTY_SETUP_ID
      }
      if (id === CONFIG_ID) {
        return CONFIG_RESOLVED_ID
      }
      if (id === VAPOR_INTEROP_ID) {
        return `\0${VAPOR_INTEROP_ID}`
      }
      if (id in INERT) {
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
      if (id.startsWith('\0') && id.slice(1) in INERT) {
        return INERT[id.slice(1)]
      }
      // The app the test environment boots, through the project's own `#imports`:
      // Nuxt's, under `@nuxt/test-utils`' `nuxt` environment. `poveste dev` renders
      // a story inside the Nuxt app its plugin boots, and a test does the same.
      if (id === `\0${ENVIRONMENT_ID}`) {
        return await this.resolve('#imports', resolve(root, 'index.html'))
          ? NUXT_ENVIRONMENT
          : `export async function environmentReady() {}\nexport function environmentApp() {\n  return undefined\n}\n`
      }
      return undefined
    },
  }
}

// The fields core's `virtual:$poveste-config` gives the browser. The rest of a
// config is build-side, and its `vite` key can hold plugins that don't serialize.
function clientConfig(config: Partial<PovesteConfig>) {
  const { theme = {} } = config
  return {
    theme: {
      title: theme.title,
      logoHref: theme.logoHref,
      defaultColorScheme: theme.defaultColorScheme,
      hideColorSchemeSwitch: theme.hideColorSchemeSwitch,
      storeColorScheme: theme.storeColorScheme,
      darkClass: theme.darkClass,
    },
    routerMode: config.routerMode,
    autoApplyContrastColor: config.autoApplyContrastColor,
    responsivePresets: config.responsivePresets,
    backgroundPresets: config.backgroundPresets,
    preview: config.preview,
    isolateStyles: config.isolateStyles,
  }
}
