import type { Plugin } from 'vite'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { povesteTestingPlugin } from 'poveste'
import { VUE_SETUP_HOOK_NAMES } from '../setup-hooks.js'
import { projectVueVersion } from '../util/project-vue.js'
import { VAPOR_INTEROP_ID, vaporInteropModule } from '../util/vapor.js'

const ENVIRONMENT_ID = 'virtual:$poveste-testing-environment'

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

export interface PovesteTestingOptions {
  /** The book's poveste config file. Found from the Vite root by default. */
  configFile?: string
}

/**
 * What a story needs in the user's own Vitest to render as `poveste dev` renders
 * it: core's testing plugin with Vue's setup hooks and `vue` pre-bundled, and what
 * only a Vue book has, a `<docs>` block and the app a Nuxt test environment boots.
 *
 * Setup code that a plugin generates for `poveste dev`, such as the Nuxt app
 * `@poveste/plugin-nuxt` boots, is left to the test environment, which already
 * provides it: `@nuxt/test-utils`'s `nuxt` environment does in a Nuxt project.
 */
export function povesteTesting(options: PovesteTestingOptions = {}): Plugin[] {
  let root = process.cwd()

  return [povesteTestingPlugin({ ...options, setupHookNames: VUE_SETUP_HOOK_NAMES, include: ['vue'] }), {
    name: 'poveste:testing-vue',

    configResolved(resolved) {
      root = resolved.root
    },

    resolveId(id) {
      if (id === VAPOR_INTEROP_ID) {
        return `\0${VAPOR_INTEROP_ID}`
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
      if (id === `\0${VAPOR_INTEROP_ID}`) {
        return vaporInteropModule(projectVueVersion(root))
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
  }]
}
