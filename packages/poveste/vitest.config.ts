import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The markdown-collection tests boot a real Vite + jiti pipeline (~2.5s each
    // locally, more on slow CI runners), which intermittently blew the 5s default.
    testTimeout: 30000,
    hookTimeout: 30000,
    // `pool.bench.ts` is not a spec, so `pnpm test` never loads it; `pnpm
    // bench:pool` is what runs it (#1020).
    benchmark: {
      include: ['src/**/*.bench.ts'],
    },
  },
})
