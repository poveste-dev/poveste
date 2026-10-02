import { HstSolid } from '@poveste/plugin-solid'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstSolid(),
  ],
  storyMatch: [
    '**/*.story.tsx',
  ],
  setupFile: 'src/poveste.setup.tsx',
})
