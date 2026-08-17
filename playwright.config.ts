import { defineConfig, devices } from '@playwright/test'

/*
 * One project per example, run from a single config (#89, step 1).
 *
 * The specs have not moved — each project points at the example's own
 * `playwright/` directory. Only the harness changes, so the test-title list is
 * identical to the one the per-example configs produce.
 *
 * The per-example configs stay for local iteration on one example. Whether they
 * survive long-term is #89's open question; until it is answered, this config is
 * the one that runs everything at once and the ports below are the contract
 * between them.
 */

interface Example {
  name: string
  port: number
  /** Specs that also run against `poveste dev` (#108). */
  dev?: { port: number, specs: string[] }
  /** Carries the conformance story set, so the shared `e2e/` suite runs on it. */
  conformance?: boolean
}

const EXAMPLES: Example[] = [
  {
    name: 'vue3',
    port: 4567,
    conformance: true,
    dev: { port: 4667, specs: ['**/user-root-css.spec.ts', '**/sandbox-color-scheme.spec.ts'] },
  },
  { name: 'nuxt4', port: 4568 },
  {
    name: 'svelte5',
    port: 4569,
    conformance: true,
    dev: { port: 4669, specs: ['**/controls-slot-isolation.spec.ts'] },
  },
  { name: 'sveltekit', port: 4570 },
  {
    name: 'vue3-tailwind',
    port: 4571,
    dev: { port: 4671, specs: ['**/style-isolation.spec.ts'] },
  },
]

function chrome(baseURL: string) {
  return { ...devices['Desktop Chrome'], baseURL }
}

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    testIdAttribute: 'data-test-id',
  },
  projects: EXAMPLES.flatMap(example => [
    {
      name: example.name,
      testDir: `./examples/${example.name}/playwright`,
      use: chrome(`http://localhost:${example.port}`),
    },
    ...example.conformance
      ? [{
          name: `${example.name}:conformance`,
          testDir: './e2e',
          use: chrome(`http://localhost:${example.port}`),
        }]
      : [],
    ...example.dev
      ? [{
          name: `${example.name}:dev`,
          testDir: `./examples/${example.name}/playwright`,
          testMatch: example.dev.specs,
          use: chrome(`http://localhost:${example.dev.port}`),
        }]
      : [],
  ]),
  // `webServer` is top-level, not per-project, so every server here starts even
  // for a single `--project` run. That is #89's step 2 and is why the
  // per-example configs are still the way to iterate on one example.
  webServer: EXAMPLES.flatMap(example => [
    {
      command: `pnpm --filter ./examples/${example.name} run story:preview`,
      url: `http://localhost:${example.port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    ...example.dev
      ? [{
          // `exec`, not `run`: pnpm drops a flag forwarded to a script, and the
          // dev server would come up on its default port instead.
          command: `pnpm --filter ./examples/${example.name} exec poveste dev --port ${example.dev.port}`,
          url: `http://localhost:${example.dev.port}`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        }]
      : [],
  ]),
})
