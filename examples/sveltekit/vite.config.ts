/// <reference types="poveste" />

import { HstSvelte } from '@poveste/plugin-svelte'
import { sveltekit } from '@sveltejs/kit/vite'
import { getDefaultConfig } from 'poveste'
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
    // Identical to the other tier-1 examples: the shared toolbar spec asserts one
    // case per preset (#89).
    backgroundPresets: [
      ...(getDefaultConfig().backgroundPresets || []),
      {
        label: 'Custom gray',
        color: '#cafff5',
        contrastColor: '#005142',
      },
    ],
    defaultBackgroundColor: 'transparent',
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
