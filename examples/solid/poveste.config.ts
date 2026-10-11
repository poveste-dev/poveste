import { HstSolid } from '@poveste/plugin-solid'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstSolid(),
  ],
  setupFile: 'src/poveste.setup.tsx',
})
