import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
// By path: this book sits inside the package, whose name it cannot import from
// here. `examples/vue` imports both by name, as a book does.
import { povesteTesting } from '../../../dist/index.node.js'

export default defineConfig({
  plugins: [vue(), povesteTesting()],
  resolve: {
    alias: {
      '@poveste/plugin-vue/testing': fileURLToPath(new URL('../../../dist/bundled/testing/index.js', import.meta.url)),
      '@poveste/plugin-vue': fileURLToPath(new URL('../../../dist/index.js', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'jsdom', environment: 'jsdom', include: ['src/**/*.story.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.story.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            // Some of this book's stories fail on purpose.
            screenshotFailures: false,
          },
        },
      },
    ],
  },
})
