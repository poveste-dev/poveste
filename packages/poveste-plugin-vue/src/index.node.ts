import type { Plugin } from 'poveste'

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { CLIENT_DEPENDENCIES } from './client-dependencies.js'
import generateStoryCommand from './commands/generate-story.server.js'
import { VUE_SETUP_HOOK_NAMES } from './setup-hooks.js'
import { listComponentFiles } from './util/list-components.js'
import { projectVueVersion } from './util/project-vue.js'
import { VAPOR_INTEROP_ID, vaporInteropModule, withoutVaporPlugin } from './util/vapor.js'
import { requireVuePlugin } from './util/vue-plugin.js'

const SCRIPT_COMPONENT = /(?<!\.d)\.[cm]?[jt]sx?$/

export function HstVue(): Plugin {
  return {
    name: '@poveste/plugin-vue',

    defaultConfig() {
      return {
        supportMatch: [
          {
            id: 'vue',
            patterns: ['**/*.vue'],
            pluginIds: ['vue3'],
          },
        ],
      }
    },

    config() {
      return {
        vite: {
          // The chrome's client code imports these, and the scan never reaches them: it
          // loads through virtual modules, so a cold `poveste dev` found them only when the
          // page asked, re-bundled and reloaded a Nuxt reader's first page (#1477). Named
          // through this package, which every Vue, Nuxt and Quasar book lists, because the
          // book itself cannot resolve them under pnpm.
          optimizeDeps: {
            include: CLIENT_DEPENDENCIES.map(name => `@poveste/plugin-vue > ${name}`),
          },
          plugins: [
            requireVuePlugin(),
            withoutVaporPlugin(),
            (() => {
              let root = process.cwd()
              return {
                name: 'poveste-plugin-vue:vapor-interop',
                configResolved(config) {
                  root = config.root
                },
                resolveId: id => id === VAPOR_INTEROP_ID ? `\0${VAPOR_INTEROP_ID}` : undefined,
                load(id) {
                  return id === `\0${VAPOR_INTEROP_ID}` ? vaporInteropModule(projectVueVersion(root)) : undefined
                },
              }
            })(),
            {
              name: 'poveste-plugin-vue',
              enforce: 'post',
              transform(code, id) {
                // Remove vue warnings about unknown components
                if ((this.meta as any).poveste?.isCollecting && id.endsWith('.vue')) {
                  return `const _stubComponent = (name) => ['Story','Variant'].some(validName => name.toLowerCase() === validName.toLowerCase()) ? _resolveComponent(name) : ({ render: () => null });${code?.replaceAll('_resolveComponent(', '_stubComponent(') ?? ''}`
                }
                return undefined
              },
            },
          ],
        },
      }
    },

    // A story file documents nothing: it names the components that do. A script file is
    // offered too, for a component written with `defineComponent` (#1463); the extractor
    // answers nothing for one that isn't.
    docgen: {
      match: file => (file.endsWith('.vue') || SCRIPT_COMPONENT.test(file)) && !/\.story\.[^/]+$/.test(file) && !file.includes('/node_modules/'),
      module: fileURLToPath(new URL('./docgen/extractor.js', import.meta.url)),
      // `vue-component-meta` requires `typescript` from where it is installed, an optional peer npm does not add.
      typescript: createRequire(import.meta.url).resolve('vue-component-meta'),
    },

    supportPlugin: {
      id: 'vue3',
      moduleName: '@poveste/plugin-vue',
      setupFn: VUE_SETUP_HOOK_NAMES,
      importStoriesPrepend: `import { defineAsyncComponent as defineAsyncComponentVue3 } from 'vue'`,
      importStoryComponent: (file, index) => `const Comp${index} = defineAsyncComponentVue3(() => import(${JSON.stringify(file.moduleId)}))`,
    },

    commands: [
      generateStoryCommand,
    ],

    async onDevEvent(api) {
      switch (api.event) {
        case 'listVueComponents': {
          return listComponentFiles(api.payload.search, api.getConfig().storyMatch)
        }
      }
      return undefined
    },
  }
}

export * from './helpers.js'
export { povesteTesting } from './testing/vite.js'
export type { PovesteTestingOptions } from './testing/vite.js'
