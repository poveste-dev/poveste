/// <reference types="poveste" />

import path from 'node:path'
import { HstTailwind } from '@poveste/plugin-tailwind'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // vue-i18n reads these compile-time feature flags; a plain Vite+Vue app has to
  // define them (a Nuxt app gets them from @nuxtjs/i18n). Vue's own flags come from
  // @vitejs/plugin-vue. Story collection applies this `define` too (#284), so no
  // `viteNodeInlineDeps` entry is needed to get it through to vue-i18n.
  define: {
    __VUE_I18N_FULL_INSTALL__: 'true',
    __VUE_I18N_LEGACY_API__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false',
  },

  // Pre-bundle lottie-web at startup. It's only reached via a runtime dynamic
  // import in a story, so Vite would otherwise discover it on first navigation
  // and force a full reload ('optimized dependencies changed. reloading').
  optimizeDeps: {
    include: ['lottie-web'],
  },

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
