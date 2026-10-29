import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defaultClientConditions } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'

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
  test: {
    // The story-test book runs under its own config, from `test:story-tests`.
    exclude: [...configDefaults.exclude, 'fixtures/**', 'src/testing/__tests__/story-tests.spec.ts'],
  },
})
