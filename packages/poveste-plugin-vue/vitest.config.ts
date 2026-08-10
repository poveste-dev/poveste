import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Point at the source, not `dist`. The state-sync tests exist to catch a
      // regression in `applyState`, and resolving the published entry would test
      // whatever was last built instead of what is in the tree.
      '@poveste/shared': fileURLToPath(new URL('../poveste-shared/src/index.ts', import.meta.url)),
    },
  },
})
