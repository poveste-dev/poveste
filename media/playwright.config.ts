import { defineConfig, devices } from '@playwright/test'

/*
 * Records the demo; it asserts nothing the suites do not already assert.
 *
 * Its own config so it cannot join them: the example projects in the root config
 * run on every commit, and a recorder that runs there costs a minute a job to
 * produce a file nobody reads. This one is run on purpose, by `pnpm run
 * record:quasar`.
 *
 * The recording still fails if the sequence stops being possible, which is the
 * point of making it a spec rather than a screen capture (#484).
 */
// The dev server, not the built book: it is what a person has open while
// working, and a built book's auto-props controls degrade for a type-only
// `defineProps` (#490), which the demo should not quietly show as normal.
const PORT = 6030

export default defineConfig({
  testDir: '.',
  outputDir: './.playwright',
  // One take, and a failed take is a failed run rather than a silent retry that
  // leaves the previous file in place.
  retries: 0,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    video: { mode: 'on', size: { width: 1280, height: 800 } },
  },
  webServer: {
    command: `pnpm --filter ./examples/quasar exec poveste dev --port ${PORT}`,
    // `cwd` defaults to this file's directory; the filter path is relative to
    // the workspace root.
    cwd: '..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    // A dev start collects every story.
    timeout: 180_000,
  },
})
