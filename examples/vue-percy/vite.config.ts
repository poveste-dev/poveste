/// <reference types="poveste" />

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
// @TODO investigate ESM errors when this is imported in vite.config.ts
// https://github.com/vitejs/vite/issues/7981
// import { HstScreenshot } from '@poveste/plugin-screenshot'

export default defineConfig({
  plugins: [
    vue(),
  ],

  poveste: {
    // plugins: [
    //   HstScreenshot(),
    // ],

    // Alternative way of specifying histoire config
    setupFile: '/src/poveste.setup.ts',
  },
})
