import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

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
  test: {
    // The story-test book is run by its own config, which needs a browser:
    // `test:story-tests`.
    exclude: [...configDefaults.exclude, 'fixtures/**', 'src/testing/__tests__/story-tests.spec.ts'],
  },
  resolve: {
    alias: {
      // Point at the source, not `dist`. The state-sync tests exist to catch a
      // regression in `applyState`, and resolving the published entry would test
      // whatever was last built instead of what is in the tree.
      '@poveste/shared': fileURLToPath(new URL('../poveste-shared/src/index.ts', import.meta.url)),
    },
  },
})
