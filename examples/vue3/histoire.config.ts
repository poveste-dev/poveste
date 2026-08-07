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
  defaultBackgroundColor: '#fff',
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
