import { defaultClientConditions } from 'vite'
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
  resolve: {
    // The renderer's spec mounts in jsdom, which needs React's DOM.
    conditions: defaultClientConditions,
  },
  test: {
    // The story-test book runs under its own config, from `test:story-tests`.
    exclude: [...configDefaults.exclude, 'fixtures/**', 'src/testing/__tests__/story-tests.spec.ts'],
  },
})
