/// <reference types="poveste" />

import vue from '@vitejs/plugin-vue'
import vike from 'vike/plugin'
import { defineConfig } from 'vite'

// The whole point of this example. Vike injects a client runtime that asserts on
// markup it put in the page; a poveste book's `index.html` is poveste's, so with
// `vike()` loaded every story renders `Couldn't find #vike_globalContext` instead
// of the component (#369).
//
// `process.env.POVESTE` is set by the poveste bin, so this one condition covers
// `poveste dev` and `poveste build` while leaving the app itself untouched.
// Documented in docs/guide/config.md, "When a framework plugin breaks your stories".
const buildingTheBook = !!process.env.POVESTE

export default defineConfig({
  plugins: [
    vue(),
    ...(buildingTheBook ? [] : [vike()]),
  ],
})
