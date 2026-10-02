import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defaultClientConditions } from 'vite'
import { defineConfig } from 'vitest/config'

// Without this file vitest loads `vite.config.ts`, whose `import(` rewrite has no
// un-rewrite outside a build: a spec reaching a dynamic import dies on
// `import__dyn is not defined`, and closing the run writes into `dist/`.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // A jsdom spec mounts components, which `svelte`'s server build refuses.
    conditions: defaultClientConditions,
    alias: {
      '@poveste/shared': fileURLToPath(new URL('../poveste-shared/src/index.ts', import.meta.url)),
    },
  },
})
