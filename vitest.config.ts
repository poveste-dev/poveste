import { defineConfig } from 'vitest/config'

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
    ],
  },
})
