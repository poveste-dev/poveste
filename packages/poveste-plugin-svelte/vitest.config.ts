import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Without this file vitest loads `vite.config.ts`, whose `import(` rewrite has no
// un-rewrite outside a build: a spec reaching a dynamic import dies on
// `import__dyn is not defined`, and closing the run writes into `dist/`.
export default defineConfig({
  resolve: {
    alias: {
      '@poveste/shared': fileURLToPath(new URL('../poveste-shared/src/index.ts', import.meta.url)),
    },
  },
})
