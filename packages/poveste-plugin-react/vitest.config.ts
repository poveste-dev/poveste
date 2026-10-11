import { defaultClientConditions } from 'vite'
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
    // The renderer's spec mounts in jsdom, which needs React's DOM.
    conditions: defaultClientConditions,
  },
})
