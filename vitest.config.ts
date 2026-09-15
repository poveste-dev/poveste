import { defineConfig } from 'vitest/config'

// Without `projects`, a root config applies vitest's default include to the
// whole repository and loads the Playwright specs under `e2e/` and `examples/`.
export default defineConfig({
  test: {
    projects: [
      'packages/*',
      {
        test: {
          name: 'scripts',
          include: ['scripts/*.spec.ts'],
          environment: 'node',
        },
      },
    ],
  },
})
