/// <reference types="poveste" />

import { HstSvelte } from '@poveste/plugin-svelte'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { getDefaultConfig } from 'poveste'
import { defineConfig } from 'vite'

export default defineConfig({
  // Pre-bundle lottie-web at startup — it's only reached via a runtime dynamic
  // import in a story, so Vite would otherwise re-optimize and force a full
  // reload on first navigation to it.
  optimizeDeps: {
    include: ['lottie-web'],
  },

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
    // `src/bench/` holds the #197 grid-fill fixtures. Out of the book unless
    // the bench runner asks — see examples/vue3/histoire.config.ts.
    storyIgnored: process.env.POVESTE_BENCH ? [] : ['**/src/bench/**'],
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
