import { HstReact } from '@poveste/plugin-react'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
    HstReact(),
  ],
  setupFile: 'src/poveste.setup.tsx',
})
