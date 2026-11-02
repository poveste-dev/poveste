import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { playwright } from '@vitest/browser-playwright'
import { defaultClientConditions } from 'vite'
import { defineConfig } from 'vitest/config'
// By path: this book sits inside the package, whose name it cannot import from
// here. `examples/svelte` imports both by name, as a book does.
import { povesteTesting } from '../../../dist/vitest.js'

export default defineConfig({
  plugins: [svelte(), povesteTesting()],
  resolve: {
    // Svelte's client build, which mounts: under jsdom, Vitest resolves for the server.
    conditions: [...defaultClientConditions],
    alias: {
      '@poveste/plugin-svelte/testing': fileURLToPath(new URL('../../../dist/testing/index.js', import.meta.url)),
      '@poveste/plugin-svelte': fileURLToPath(new URL('../../../dist/index.js', import.meta.url)),
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
