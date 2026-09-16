/// <reference types="poveste" />

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],

  poveste: {
    setupFile: 'src/poveste.setup.ts',
  },
})
