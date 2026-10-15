import type { Plugin as VitePlugin } from 'vite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const QUASAR_CONFIGS = ['quasar.config.js', 'quasar.config.mjs', 'quasar.config.cjs', 'quasar.config.ts']

/**
 * What to say when a book's Vite config has no Vue plugin. Without one, Vite
 * answers the first `.vue` file with "Install @vitejs/plugin-vue", which sends a
 * Quasar reader to install a package their project does not need: Quasar brings
 * its own Vue plugin, and `HstQuasar()` is what hands it to Poveste (#1337).
 */
export function noVuePluginMessage(root: string, exists: (path: string) => boolean = existsSync): string {
  const fix = QUASAR_CONFIGS.some(name => exists(join(root, name)))
    ? 'This is a Quasar project: add `HstQuasar()` from `@poveste/plugin-quasar` to the config\'s `plugins`, which brings Quasar\'s own Vue plugin.'
    : 'Add `@vitejs/plugin-vue` to `vite.config`, or in a Nuxt project `HstNuxt()` from `@poveste/plugin-nuxt` to the config\'s `plugins`.'
  return `[poveste] The Vite config has no Vue plugin, so no \`.vue\` story can be compiled. ${fix}`
}

/** Reports, once per process, a resolved Vite config with no Vue plugin in it. */
export function requireVuePlugin(): VitePlugin {
  let reported = false
  return {
    name: 'poveste-plugin-vue:require-vue-plugin',
    configResolved(config) {
      if (!reported && !config.plugins.some(plugin => plugin.name === 'vite:vue')) {
        reported = true
        console.error(noVuePluginMessage(config.root))
      }
    },
  }
}
