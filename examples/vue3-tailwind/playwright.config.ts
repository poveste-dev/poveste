import { defineConfig, devices } from '@playwright/test'

const PREVIEW_PORT = 4571
const DEV_PORT = 4671

// See examples/vue3/playwright.config.ts — dev and build isolate user CSS by
// different means, and only the built one was ever tested (#108). This example
// exists to be a consumer with a global Tailwind preflight, so its whole suite
// is the isolation surface.
const ISOLATION_SPECS = ['**/style-isolation.spec.ts']

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
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
      // `pnpm exec`, not `pnpm run`: pnpm drops the forwarded flag and the
      // server binds its default port instead.
      command: `pnpm exec poveste dev --port ${DEV_PORT}`,
      url: `http://localhost:${DEV_PORT}`,
      reuseExistingServer: !process.env.CI,
      // A dev start collects every story; preview only serves built files.
      timeout: 180_000,
    },
  ],
})
