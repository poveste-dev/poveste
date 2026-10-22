import type { Plugin } from '@poveste/shared'

// No Node-only import here, on purpose: a story file imports `defineStory` from
// this entry, so it is bundled for the browser as well as loaded by the config.

export const REACT_SETUP_HOOK_NAMES = ['setupReact']

// A variable, not a literal: Vite turns `new URL('<literal>', import.meta.url)` into
// an asset, and this entry is bundled for the browser too.
const DOCGEN_EXTRACTOR = './docgen/extractor.js'

export function HstReact(): Plugin {
  return {
    name: '@poveste/plugin-react',

    // A React story names its component in `component`, so the extractor reads the story (#1161).
    docgen: {
      scope: 'story',
      match: file => /\.story\.[jt]sx$/.test(file),
      module: new URL(DOCGEN_EXTRACTOR, import.meta.url).href,
      // The JSX walker loads the book's TypeScript (#1401). React ships no types of its own.
      typescript: 'book',
      types: ['@types/react'],
    },

    defaultConfig() {
      return {
        // Added to core's defaults rather than replacing them (#1124), so a book
        // with React stories needs no `storyMatch` of its own.
        storyMatch: ['**/*.story.tsx', '**/*.story.jsx'],
        supportMatch: [
          {
            id: 'react',
            patterns: ['**/*.story.tsx', '**/*.story.jsx'],
            pluginIds: ['react'],
          },
        ],
        vite: {
          plugins: [
            reloadOnStoryEdit(),
          ],
          // The story's JSX and this plugin's renderer must share one React: a
          // hook called through a second copy throws "Invalid hook call", the
          // same split as two Vue runtimes (#1060).
          resolve: {
            dedupe: ['react', 'react-dom'],
          },
          // React ships CommonJS, so Vite pre-bundles it, and the renderer's
          // imports are found only once a story is opened. Found in two passes,
          // the second re-chunks `react-dom` while the server still hands out the
          // first pass's copy, and `react-dom/client` fails to import from it on
          // every load until the cache is cleared. Named here, all of them are
          // bundled in the first pass.
          optimizeDeps: {
            include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'],
          },
        },
      }
    },

    supportPlugin: {
      id: 'react',
      moduleName: '@poveste/plugin-react',
      setupFn: REACT_SETUP_HOOK_NAMES,
      importStoryComponent: (file, index) => `import Comp${index} from ${JSON.stringify(file.moduleId)}`,
    },
  }
}

export * from './types.js'

/**
 * Reloads the book when a React story file is edited in dev.
 *
 * A story file is data, so there is no component for Fast Refresh to patch in
 * place, and the sandbox keeps the story it mapped on mount rather than taking
 * the updated module: the edit was collected and then never shown. A reload
 * shows it, at the cost of whatever was set in the panel. A component the story
 * imports is not a story file and still refreshes in place.
 */
function reloadOnStoryEdit() {
  return {
    name: 'poveste:react-story-reload',
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
