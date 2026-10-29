import { defineConfig } from 'poveste'

// No `HstReact()`: a story test reads the setup file and nothing that a plugin
// adds. Written root-relative, as the docs write it (#1507).
export default defineConfig({
  setupFile: '/src/setup.tsx',
})
