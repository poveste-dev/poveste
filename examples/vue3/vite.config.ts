/// <reference types="poveste" />

import path from 'node:path'
import { HstTailwind } from '@poveste/plugin-tailwind'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // Example build config for a component library
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, './src/main.ts'),
      name: 'poveste-kit',
      fileName: format => `poveste-kit.${format}.js`,
    },

    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue',
        },
      },
    },
  },

  server: {
    hmr: {
      clientPort: process.env.CODESPACES ? 443 : undefined,
    },
    port: 5173,
    host: true,

  },

  plugins: [
    vue(),
  ],

  poveste: {
    plugins: [
      HstTailwind(),
      {
        name: 'test',
        config() {
          return {
            theme: {
              logoHref: 'https://poveste.dev',
              favicon: 'poveste.svg',
            },
          }
        },
      },
    ],

    // Alternative way of specifying histoire config
    setupFile: '/src/poveste.setup.ts',

    // theme: {
    //   logoHref: 'http://poveste.dev',
    // },

    tree: {
      groups: [
        {
          id: 'top',
          title: '',
        },
        {
          title: 'My Group',
          include: file => /Code gen|Controls|Docs/.test(file.title),
        },
        {
          title: 'Components',
          include: file => !file.title.includes('Serialize'),
        },
      ],
    },
  },
})
