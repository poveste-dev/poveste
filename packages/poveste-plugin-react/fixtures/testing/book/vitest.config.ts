import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
// By path: this book sits inside the package, whose name it cannot import from
// here. `examples/react` imports both by name, as a book does.
import { povesteTesting } from '../../../dist/vitest.js'

export default defineConfig({
  plugins: [react(), povesteTesting()],
  resolve: {
    alias: {
      '@poveste/plugin-react/testing': fileURLToPath(new URL('../../../dist/testing/index.js', import.meta.url)),
      '@poveste/plugin-react': fileURLToPath(new URL('../../../dist/index.js', import.meta.url)),
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
