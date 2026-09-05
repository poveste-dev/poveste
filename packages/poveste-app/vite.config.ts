import vue from '@vitejs/plugin-vue'
import fs from 'fs-extra'
import { globbySync } from 'globby'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'poveste:preserve:import.meta',
      enforce: 'pre',
      transform(code) {
        if (code.includes('import.meta')) {
          return {
            code: code.replace(/import\.meta/g, 'import__meta'),
          }
        }
      },
      closeBundle() {
        try {
          const files = globbySync('./dist/bundled/**/*.js')
          for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8')
            if (content.includes('import__meta')) {
              fs.writeFileSync(file, content.replace(/import__meta/g, 'import.meta'), 'utf-8')
            }
          }
        }
        catch (e) {
          console.error(e)
        }
      },
    },
  ],

  resolve: {
    alias: {
      'floating-vue': '@poveste/vendors/floating-vue',
      '@iconify/vue': '@poveste/vendors/iconify',
      'pinia': '@poveste/vendors/pinia',
      'scroll-into-view-if-needed': '@poveste/vendors/scroll',
      'vue-router': '@poveste/vendors/vue-router',
      '@vueuse/core': '@poveste/vendors/vue-use',
      'vue': '@poveste/vendors/vue',
    },
  },

  build: {
    emptyOutDir: false,
    outDir: 'dist/bundled',
    lib: {
      entry: '',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /\$poveste/,
        /@poveste/,
        // Each dependency and its subpaths. Bare names alone left `shiki/core`
        // unmatched, so it was resolved and inlined as a path into the build
        // machine's pnpm store (#304).
        // eslint-disable-next-line ts/no-require-imports
        ...Object.keys(require('./package.json').dependencies)
          .map(name => new RegExp(`^${RegExp.escape(name)}(/|$)`)),
      ],

      input: [
        'src/app/api.ts',
        'src/app/index.ts',
        'src/app/sandbox.ts',
      ],

      output: {
        // manualChunks (id) {
        //   if (id.includes('node_modules')) {
        //     return 'vendor'
        //   }
        // },
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        // hoistTransitiveImports: false,
        preserveModules: true,
        preserveModulesRoot: 'src/app',
      },
      treeshake: false,
      preserveEntrySignatures: 'strict',
    },
    cssCodeSplit: false,
    minify: false,
  },
})
