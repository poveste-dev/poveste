import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4568',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Port is unique per example: `reuseExistingServer` would otherwise adopt
  // another book's preview and test it instead (#175).
  webServer: {
    command: 'pnpm run story:preview',
    url: 'http://localhost:4568',
      // Never reused, even locally: a preview server serves the build it started
      // with and does not notice a rebuild underneath it (#477).
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
