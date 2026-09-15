import { defineConfig } from 'vitest/config'
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
          environment: 'node',
        },
      },
      {
        test: {
          name: 'checks',
          include: ['scripts/checks/*.check.ts'],
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
