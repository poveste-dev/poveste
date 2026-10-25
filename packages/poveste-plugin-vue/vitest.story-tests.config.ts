import { defineConfig } from 'vitest/config'

// `story-tests.spec.ts` alone. It runs the story-test book in jsdom and in a
// browser, so it waits for CI's browser install rather than running with `test`.
export default defineConfig({
  test: {
    include: ['src/testing/__tests__/story-tests.spec.ts'],
    testTimeout: 180_000,
  },
})
