import type { Plugin } from '@poveste/shared'

// No Node-only import here, on purpose: a story file imports `defineStory` from
// this entry, so it is bundled for the browser as well as loaded by the config.

export const SOLID_SETUP_HOOK_NAMES = ['setupSolid']

/**
 * The conditions story collection resolves Solid under.
 *
 * Collection imports each story file in Node to read its metadata, and Solid's
 * JSX compiles to DOM calls that run at module top level (`template()`). Under
 * Node's own conditions every `solid-js` entry is the server build, where those
 * throw "Client-only API called on the server side". Collection runs with a DOM,
 * so the browser build works.
 *
 * The conditions alone are not enough. An entry Node loads resolves its own
 * imports under Node's conditions: `solid-js/html` has no browser build of its
 * own, imports `solid-js/web`, and so reached the server build anyway. Inlining
 * every `solid-js` entry (`noExternal`) keeps the whole graph in Vite's hands.
 *
 * Without `development`: collection re-evaluates Solid on every run, and its
 * development build warns "multiple instances of Solid" each time it does.
 * Nothing renders during collection, so the production build loses nothing.
 */
export const SOLID_COLLECT_CONDITIONS = ['browser', 'module']

// A variable, not a literal: Vite turns `new URL('<literal>', import.meta.url)` into
// an asset, and this entry is bundled for the browser too.
const DOCGEN_EXTRACTOR = './docgen/extractor.js'

export function HstSolid(): Plugin {
  return {
    name: '@poveste/plugin-solid',

    // A Solid story names its component in `component`, so the extractor reads the story (#1110).
    docgen: {
      scope: 'story',
      match: file => /\.story\.[jt]sx$/.test(file),
      module: new URL(DOCGEN_EXTRACTOR, import.meta.url).href,
    },

    defaultConfig() {
      return {
        supportMatch: [
          {
            id: 'solid',
            patterns: ['**/*.story.tsx', '**/*.story.jsx'],
            pluginIds: ['solid'],
          },
        ],
        vite: {
          plugins: [
            reloadOnStoryEdit(),
          ],
          // The story's JSX and this plugin's renderer must share one Solid
          // runtime: two copies track reads in two graphs, and a store written
          // through one never updates DOM the other built.
          resolve: {
            dedupe: ['solid-js'],
          },
          ssr: {
            noExternal: ['solid-js'],
            resolve: {
              conditions: SOLID_COLLECT_CONDITIONS,
            },
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
 * Reloads the book when a Solid story file is edited in dev.
 *
 * A story file is data, so there is no component for HMR to patch in place, and
 * the sandbox keeps the story it mapped on mount rather than taking the updated
 * module: the edit was collected and then never shown. A reload shows it, at the
 * cost of whatever was set in the panel.
 */
function reloadOnStoryEdit() {
  return {
    name: 'poveste:solid-story-reload',
    apply: 'serve' as const,
    handleHotUpdate({ file, server }: { file: string, server: { ws: { send: (payload: { type: 'full-reload' }) => void } } }) {
      if (!/\.story\.[jt]sx$/.test(file)) {
        return undefined
      }
      server.ws.send({ type: 'full-reload' })
      return []
    },
  }
}
