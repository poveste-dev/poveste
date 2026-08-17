import { defineConfig, devices } from '@playwright/test'

const PREVIEW_PORT = 4567
const DEV_PORT = 4667

// Specs that run against `poveste dev` as well as against a built book. The two
// paths isolate user CSS by different means — dev wraps it in `@scope` at
// transform time, a build wraps its main entry and ships the sandbox entry
// unwrapped — and only the built one was ever tested (#108).
const ISOLATION_SPECS = ['**/user-root-css.spec.ts', '**/sandbox-color-scheme.spec.ts']

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    testIdAttribute: 'data-test-id',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PREVIEW_PORT}` },
    },
    {
      name: 'dev',
      testMatch: ISOLATION_SPECS,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${DEV_PORT}` },
    },
  ],
  // Ports are unique per example: `reuseExistingServer` would otherwise adopt
  // another book's server and test it instead (#175). `webServer` is top-level
  // rather than per-project, so both start even for a single-project run.
  webServer: [
    {
      command: 'pnpm run story:preview',
      url: `http://localhost:${PREVIEW_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // `pnpm exec`, not `pnpm run story:dev`: pnpm drops the forwarded flag
      // and the server comes up on the default port instead, where nothing is
      // waiting for it.
      command: `pnpm exec poveste dev --port ${DEV_PORT}`,
      url: `http://localhost:${DEV_PORT}`,
      reuseExistingServer: !process.env.CI,
      // Longer than the preview server's: a dev start collects every story and
      // optimizes deps, where preview only serves files that already exist.
      timeout: 180_000,
    },
  ],
})
