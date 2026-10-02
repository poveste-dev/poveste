import type { Plugin } from '@poveste/shared'

// No Node-only import here, on purpose: a story file imports `defineStory` from
// this entry, so it is bundled for the browser as well as loaded by the config.

export const SOLID_SETUP_HOOK_NAMES = ['setupSolid']

export function HstSolid(): Plugin {
  return {
    name: '@poveste/plugin-solid',

    async defaultConfig() {
      const solidBrowserAliases = await getSolidBrowserAliases()

      return {
        supportMatch: [
          {
            id: 'solid',
            patterns: ['**/*.story.tsx', '**/*.story.jsx'],
            pluginIds: ['solid'],
          },
        ],
        vite: {
          // The story's JSX and this plugin's renderer must share one Solid
          // runtime: two copies track reads in two graphs, and a store written
          // through one never updates DOM the other built.
          resolve: {
            dedupe: ['solid-js'],
            ...solidBrowserAliases.length ? { alias: solidBrowserAliases } : {},
          },
        },
      }
    },

    supportPlugin: {
      id: 'solid',
      moduleName: '@poveste/plugin-solid',
      setupFn: SOLID_SETUP_HOOK_NAMES,
      importStoryComponent: (file, index) => `import Comp${index} from ${JSON.stringify(file.moduleId)}`,
    },
  }
}

export * from './types.js'

/**
 * Solid's browser builds, by absolute path, for every environment.
 *
 * Collection imports each story file in Node to read its metadata. Solid's JSX
 * compiles to DOM calls that run at module top level (`template()`), and under
 * Node's conditions `solid-js/web` is the server build, where they throw
 * "Client-only API called on the server side". Collection runs with a DOM, so
 * the browser build works there, and an absolute path keeps Node's own
 * resolution from choosing for it. `plugin-svelte` does the same for Svelte.
 *
 * Chosen as Solid's `exports` choose: the development build unless the book is
 * built for production.
 */
async function getSolidBrowserAliases(): Promise<{ find: RegExp, replacement: string }[]> {
  // Imported here rather than at the top: story files import this entry for
  // `defineStory`, and a static Node import would follow it into the browser.
  const { createRequire } = await import('node:module')
  const { existsSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')

  try {
    const require = createRequire(join(process.cwd(), 'package.json'))
    const solidDir = dirname(require.resolve('solid-js/package.json'))
    const development = process.env['NODE_ENV'] !== 'production'
    const entries = [
      [/^solid-js$/, development ? 'dist/dev.js' : 'dist/solid.js'],
      [/^solid-js\/web$/, development ? 'web/dist/dev.js' : 'web/dist/web.js'],
      [/^solid-js\/store$/, development ? 'store/dist/dev.js' : 'store/dist/store.js'],
    ] as const

    return entries
      .map(([find, file]) => ({ find, replacement: join(solidDir, file) }))
      .filter(({ replacement }) => existsSync(replacement))
  }
  catch {
    return []
  }
}
