import type { Plugin } from 'poveste'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'pathe'
import { defaultColors } from 'poveste'
import generateStoryCommand from './commands/generate-story.server.js'
import { svelteAutoProps } from './util/auto-props-vite.js'
import { svelteKitAssetsDir } from './util/kit-assets.js'
import { listComponentFiles } from './util/list-components.js'
import { disableStoryComponentHmr } from './util/story-hmr.js'

export function HstSvelte(): Plugin {
  return {
    name: '@poveste/plugin-svelte',

    async defaultConfig() {
      const svelteClientAliases = getSvelteClientAliases()
      const publicDir = await svelteKitAssetsDir(process.cwd())

      return {
        supportMatch: [
          {
            id: 'svelte',
            patterns: ['**/*.svelte'],
            pluginIds: ['svelte4'],
          },
        ],
        theme: {
          colors: {
            primary: defaultColors.orange,
          },
          logo: {
            square: '@poveste/plugin-svelte/assets/poveste-svelte.svg',
            light: '@poveste/plugin-svelte/assets/poveste-svelte-text.svg',
            dark: '@poveste/plugin-svelte/assets/poveste-svelte-text.svg',
          },
        },
        viteIgnorePlugins: [
          'vite-plugin-sveltekit-compile',
        ],
        vite: {
          plugins: [
            svelteAutoProps(),
            disableStoryComponentHmr(),
          ],
          ...svelteClientAliases.length ? { resolve: { alias: svelteClientAliases } } : {},
          ...publicDir ? { publicDir } : {},
        },
      }
    },

    supportPlugin: {
      id: 'svelte4',
      moduleName: '@poveste/plugin-svelte',
      setupFn: ['setupSvelte3', 'setupSvelte4', 'setupSvelte5'],
      importStoryComponent: (file, index) => `import Comp${index} from ${JSON.stringify(file.moduleId)}`,
    },

    commands: [
      generateStoryCommand,
    ],

    async onDevEvent(api) {
      switch (api.event) {
        case 'listSvelteComponents': {
          return listComponentFiles(api.payload.search, api.getConfig().storyMatch)
        }
      }
    },
  }
}

export * from './helpers.js'

function getSvelteClientAliases() {
  try {
    const require = createRequire(join(process.cwd(), 'package.json'))
    const sveltePackagePath = require.resolve('svelte/package.json')
    const svelteDir = dirname(sveltePackagePath)

    const aliasEntries = [
      [/^svelte$/, join(svelteDir, 'src/index-client.js')],
      [/^svelte\/legacy$/, join(svelteDir, 'src/legacy/legacy-client.js')],
      [/^svelte\/store$/, join(svelteDir, 'src/store/index-client.js')],
      [/^svelte\/reactivity$/, join(svelteDir, 'src/reactivity/index-client.js')],
    ] as const

    return aliasEntries
      .filter(([, replacement]) => existsSync(replacement))
      .map(([find, replacement]) => ({
        find,
        replacement,
      }))
  }
  catch {
    return []
  }
}
