import { defineConfig, devices } from '@playwright/test'

const PREVIEW_PORT = 4569
const DEV_PORT = 4669

// See examples/vue3/playwright.config.ts — dev and build isolate user CSS by
// different means, and only the built one was ever tested (#108).
const ISOLATION_SPECS = ['**/controls-slot-isolation.spec.ts']

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
  // another book's server and test it instead (#175).
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
