import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
  ],
  // The Vike app's own pages are not stories.
  storyIgnored: [
    '**/node_modules/**',
    '**/dist/**',
    '**/pages/**',
  ],
})
