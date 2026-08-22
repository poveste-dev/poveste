import { HstNuxt } from '@poveste/plugin-nuxt'
import { HstTailwind } from '@poveste/plugin-tailwind'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig, getDefaultConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
    HstNuxt(),
    HstTailwind(),
  ],
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

  // Mirrors the vue3 example: the same stories, the same setup, and the same
  // tree groups, so opening either book shows the same list. A framework's own
  // stories sit under a `Nuxt/` title so the shared set stays recognisable.
  setupFile: '/app/poveste.setup.ts',

  tree: {
    groups: [
      {
        id: 'top',
        title: '',
      },
      {
        title: 'My Group',
        include: file => /Code gen|Controls|Docs/.test(file.title),
      },
      {
        title: 'Components',
        include: file => !file.title.includes('Serialize'),
      },
    ],
  },
})
