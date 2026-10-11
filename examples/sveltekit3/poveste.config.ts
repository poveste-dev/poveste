import { HstSvelte } from '@poveste/plugin-svelte'
import { defineConfig, getDefaultConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstSvelte(),
  ],
  theme: {
    favicon: 'logo.svg',
  },
  // What the shared `e2e/` suite asserts of every conformance book: the default
  // presets plus one, and a transparent default (#540).
  backgroundPresets: [
    ...(getDefaultConfig().backgroundPresets || []),
    {
      label: 'Custom gray',
      color: '#cafff5',
      contrastColor: '#005142',
    },
  ],
  defaultBackgroundColor: 'transparent',
})
