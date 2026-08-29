import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Without this file vitest falls back to `vite.config.ts`, which is the library
// build config: its `import(` rewrite has no matching un-rewrite outside a build,
// so any spec reaching a module with a dynamic import dies on `import__dyn is not
// defined`, and closing the run fires `closeBundle` and writes into `dist/`.
export default defineConfig({
  test: {
    // Scoped, so a stray spec left anywhere in the package is not collected.
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      // Source, not `dist` — otherwise a stale build is what gets tested.
      '@poveste/shared': fileURLToPath(new URL('../poveste-shared/src/index.ts', import.meta.url)),
    },
  },
})
