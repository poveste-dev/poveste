import { HstReact } from '@poveste/plugin-react'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstReact(),
  ],
  storyMatch: [
    '**/*.story.tsx',
  ],
  setupFile: 'src/poveste.setup.tsx',
})
