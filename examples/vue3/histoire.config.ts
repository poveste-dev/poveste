import { HstVue } from '@poveste/plugin-vue'
import { defineConfig, getDefaultConfig } from 'poveste'

export default defineConfig({
  // outDir: 'hdist',
  plugins: [
    HstVue(),
  ],
  backgroundPresets: [
    ...(getDefaultConfig().backgroundPresets || []),
    {
      label: 'Custom gray',
      color: '#cafff5',
      contrastColor: '#005142',
    },
  ],
  defaultBackgroundColor: 'transparent',
  // `src/bench/` holds the #197 grid-fill fixtures. Out of the book unless the
  // bench runner asks, so the story-list counts and anyone browsing the example
  // never see them. Defaults spread in on purpose: a bare override loses them
  // and the build crawls node_modules into EMFILE (#244).
  storyIgnored: [
    ...getDefaultConfig().storyIgnored,
    ...(process.env.POVESTE_BENCH ? [] : ['**/src/bench/**']),
  ],
  // autoApplyContrastColor: true,
  // routerMode: 'hash',
  head: {
    meta: [
      { name: 'theme-color', content: '#10b981' },
    ],
  },
  theme: {
    darkClass: 'my-dark',
  },
})
