/// <reference types="poveste" />

import { HstSvelte } from '@poveste/plugin-svelte'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sveltekit(),
  ],
  poveste: {
    plugins: [
      HstSvelte(),
    ],
    setupFile: './src/poveste.setup.ts',
    tree: {
      groups: [
        {
          id: 'top',
          title: '',
        },
      ],
    },
  },
})
