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
  /** Specs that also run against `poveste dev` (#108). `shared` are in `e2e/`. */
  dev?: { port: number, specs?: string[], shared?: string[] }
  /** Carries the conformance story set, so the shared `e2e/` suite runs on it. */
  conformance?: boolean
}

const ALL_EXAMPLES: Example[] = [
  {
    name: 'vue3',
    port: 4567,
    conformance: true,
    dev: { port: 4667, specs: ['**/user-root-css.spec.ts', '**/sandbox-direct.spec.ts'], shared: ['**/sandbox-color-scheme.spec.ts'] },
  },
  { name: 'nuxt4', port: 4568, conformance: true },
  {
    name: 'svelte5',
    port: 4569,
    conformance: true,
    dev: { port: 4669, specs: ['**/controls-slot-isolation.spec.ts'] },
  },
  { name: 'sveltekit', port: 4570, conformance: true },
  {
    name: 'vue3-tailwind',
    port: 4571,
    dev: { port: 4671, specs: ['**/style-isolation.spec.ts'] },
  },
]

/*
 * Which examples this run covers, from `POVESTE_E2E_EXAMPLE` (comma-separated,
 * empty means all). This is #89's step 2, and the decision it left open.
 *
 * `webServer` is a top-level option, so `--project=svelte5` on its own still
 * boots every server in the array — four book builds and four preview servers
 * to run one framework's specs. Filtering here is what makes a job per
 * framework worth having: CI can fan out over the examples and each job pays
 * for its own server only, and the failure is attributed to a framework by
 * which job went red rather than by reading a project name out of a log.
 *
 * `--project` still works and still filters; this narrows what gets started.
 * Naming an example that does not exist is an error rather than an empty run,
 * because a silent no-op here reads exactly like a suite that passed.
 */
const selected = (process.env.POVESTE_E2E_EXAMPLE ?? '')
  .split(',')
  .map(name => name.trim())
  .filter(Boolean)

for (const name of selected) {
  if (!ALL_EXAMPLES.some(example => example.name === name)) {
    throw new Error(`POVESTE_E2E_EXAMPLE names "${name}", which is not one of: ${ALL_EXAMPLES.map(e => e.name).join(', ')}`)
  }
}

const EXAMPLES = selected.length
  ? ALL_EXAMPLES.filter(example => selected.includes(example.name))
  : ALL_EXAMPLES

function chrome(baseURL: string) {
  return { ...devices['Desktop Chrome'], baseURL }
}

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // `retries` turns a flake into a green job, so CI also needs a machine-readable
  // result to find one after the fact — the list output is for humans and is not
  // a stable contract (#75).
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: 'playwright-results.json' }]]
    : 'list',
  use: {
    trace: 'on-first-retry',
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
    ...example.dev?.specs
      ? [{
          name: `${example.name}:dev`,
          testDir: `./examples/${example.name}/playwright`,
          testMatch: example.dev.specs,
          use: chrome(`http://localhost:${example.dev.port}`),
        }]
      : [],
    // Shared specs against the dev server: the spec moved to `e2e/`, and the
    // dev-vs-build divergence it guards did not move with it (#108).
    ...example.dev?.shared
      ? [{
          name: `${example.name}:dev-shared`,
          testDir: './e2e',
          testMatch: example.dev.shared,
          use: chrome(`http://localhost:${example.dev.port}`),
        }]
      : [],
  ]),
  // Only the selected examples' servers, which is the whole point of the filter
  // above — see it for why.
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
