import { defineConfig } from 'poveste'

// No `HstVue()`: a story test reads the setup file and nothing that a plugin adds,
// and this book cannot import the package it sits inside by name. The setup file
// is written root-relative, as the docs write it (#1507).
export default defineConfig({
  setupFile: '/src/setup.ts',
})
