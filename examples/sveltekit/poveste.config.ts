import { HstSvelte } from '@poveste/plugin-svelte'
import { defineConfig, getDefaultConfig } from 'poveste'

// Beside `vite.config.ts` rather than under its `poveste` key, which a project
// can use and this workspace cannot type: pnpm gives this book and `poveste` two
// instances of `vite`, and the key is declared on the other one (#1206).
export default defineConfig({
  plugins: [
    HstSvelte(),
  ],
  setupFile: '/src/poveste.setup.ts',
  // Identical to the other tier-1 examples: the shared toolbar spec asserts one
  // case per preset (#89).
  backgroundPresets: [
    ...(getDefaultConfig().backgroundPresets || []),
    {
      label: 'Custom gray',
      color: '#cafff5',
      contrastColor: '#005142',
    },
  ],
  defaultBackgroundColor: 'transparent',
  tree: {
    groups: [
      {
        id: 'top',
        title: '',
      },
    ],
  },
})
