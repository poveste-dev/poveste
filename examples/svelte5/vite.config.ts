/// <reference types="poveste" />

import { HstSvelte } from '@poveste/plugin-svelte'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { getDefaultConfig } from 'poveste'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    svelte(),
  ],
  poveste: {
    plugins: [
      HstSvelte(),
    ],
    setupFile: './poveste.setup.ts',
    // Kept identical to the vue3 example on purpose: the shared toolbar spec
    // asserts one case per preset, so a tier-1 example that offers a different
    // set would fail the shared suite rather than its own config (#89).
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
