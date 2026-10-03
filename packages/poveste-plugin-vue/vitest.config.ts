import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      // Poveste serves the setup modules at build time; a spec mocks them, and
      // the mock needs an id that resolves first.
      name: 'poveste:virtual-setup-stub',
      resolveId: id => id.startsWith('virtual:$poveste-') ? `\0${id}` : undefined,
      load: id => id.startsWith('\0virtual:$poveste-') ? 'export {}' : undefined,
    },
  ],
  resolve: {
    alias: {
      // Point at the source, not `dist`. The state-sync tests exist to catch a
      // regression in `applyState`, and resolving the published entry would test
      // whatever was last built instead of what is in the tree.
      '@poveste/shared': fileURLToPath(new URL('../poveste-shared/src/index.ts', import.meta.url)),
    },
  },
})
