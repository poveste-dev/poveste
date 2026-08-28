import { defineConfig, devices } from '@playwright/test'

const PREVIEW_PORT = 4573
const DEV_PORT = 4673

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
      timeout: 180_000,
    },
  ],
})
