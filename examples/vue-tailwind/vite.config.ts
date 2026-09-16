/// <reference types="poveste" />

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
  ],

  poveste: {
    setupFile: '/src/poveste.setup.ts',
  },
})
