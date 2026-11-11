import { defineConfig } from 'poveste'

// No `HstVue()`: a story test reads the setup file and nothing that a plugin adds,
// and this book cannot import the package it sits inside by name. The setup file
// is written root-relative, as the docs write it (#1507). `FIXTURE_SETUP_FILE` lets
// a spec name another, or `none`, without editing this file (#1663).
const setupFile = process.env.FIXTURE_SETUP_FILE ?? '/src/setup.ts'

export default defineConfig({
  setupFile: setupFile === 'none' ? undefined : setupFile,
})
