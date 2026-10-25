import { defineConfig } from 'poveste'

// No `HstVue()`: a story test reads the setup file and nothing that a plugin adds,
// and this book cannot import the package it sits inside by name.
export default defineConfig({
  setupFile: './src/setup.ts',
})
