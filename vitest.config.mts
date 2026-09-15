import { configDefaults, defineConfig } from 'vitest/config'
import { NEED_TAGS, SUBJECT_TAGS } from './scripts/checks/tag-names.mts'

// Without `projects`, a root config applies vitest's default include to the
// whole repository and loads the Playwright specs under `e2e/` and `examples/`.
//
// No `packages/*` entry: `--project` filters after every project's config has
// loaded, and `poveste-app/vite.config.ts` needs `@poveste/shared` built, which
// `test:scripts` runs before. `pnpm test` runs each package from its own
// directory instead.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'scripts',
          // `**`, not `*`: a spec in a subdirectory would otherwise be skipped
          // with a green exit.
          include: ['scripts/**/*.spec.ts'],
          // The checks are their own project: they assert the repository, some after a
          // build or against the network, and each runs from its own script.
          exclude: [...configDefaults.exclude, 'scripts/checks/**'],
          environment: 'node',
          // Measured −22% on the test phase by `vitest doctor`. It also stops the
          // forks pool reporting the worker's own stdin pipe as an async leak
          // whenever a module imports `node:process`.
          pool: 'threads',
        },
      },
      {
        test: {
          name: 'checks',
          include: ['scripts/checks/*.spec.ts'],
          tags: Object.entries({ ...SUBJECT_TAGS, ...NEED_TAGS }).map(([name, description]) => ({ name, description })),
          environment: 'node',
          // A check can pack every package or install a starter from the
          // registry, far past the 5s default.
          testTimeout: 0,
        },
      },
    ],
  },
})
