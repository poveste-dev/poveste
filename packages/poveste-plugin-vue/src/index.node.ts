import type { Plugin } from 'poveste'

import generateStoryCommand from './commands/generate-story.server.js'
import { VUE_SETUP_HOOK_NAMES } from './setup-hooks.js'
import { listComponentFiles } from './util/list-components.js'

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
          plugins: [
            {
              name: 'poveste-plugin-vue',
              enforce: 'post',
              transform(code, id) {
                // Remove vue warnings about unknown components
                if ((this.meta as any).poveste?.isCollecting && id.endsWith('.vue')) {
                  return `const _stubComponent = (name) => ['Story','Variant'].some(validName => name.toLowerCase() === validName.toLowerCase()) ? _resolveComponent(name) : ({ render: () => null });${code?.replaceAll('_resolveComponent(', '_stubComponent(') ?? ''}`
                }
              },
            },
          ],
        },
      }
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
    },
  }
}

export * from './helpers.js'
