import { globSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import { CHECK_TAG, NEED_TAGS, SUBJECT_TAGS } from './scripts/checks/support/tag-names.mts'

// `**`, not `*`: a spec in a subdirectory would otherwise be skipped with a
// green exit.
const SCRIPTS_INCLUDE = ['scripts/**/*.spec.ts']

// Every check runs as a spec under `scripts/`, so a narrower include takes
// checks out of `test:scripts` and `test:checks` and both still exit 0 — the
// release gate included (#769). Held against the directory rather than a count,
// which would drift with every new check. Failing here fails every run.
const included = new Set(globSync(SCRIPTS_INCLUDE, { cwd: import.meta.dirname }))
const unincluded = readdirSync(join(import.meta.dirname, 'scripts'), { recursive: true, encoding: 'utf8' })
  .map(file => join('scripts', file))
  .filter(file => file.endsWith('.spec.ts') && !file.includes('node_modules'))
  .filter(file => !included.has(file))
if (unincluded.length > 0) {
  throw new Error(`The \`scripts\` project's include misses ${unincluded.length} spec${unincluded.length === 1 ? '' : 's'} under scripts/, which would leave the run and pass: ${unincluded.join(', ')}`)
}

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
          include: SCRIPTS_INCLUDE,
          environment: 'node',
          // Measured −22% on the test phase by `vitest doctor`. It also stops the
          // forks pool reporting the worker's own stdin pipe as an async leak
          // whenever a module imports `node:process`.
          pool: 'threads',
          // A need tag lifts the timeout: those checks pack, build or wait on
          // the registry, far past the 5s default.
          tags: [
            ...Object.entries({ ...CHECK_TAG, ...SUBJECT_TAGS }).map(([name, description]) => ({ name, description })),
            ...Object.entries(NEED_TAGS).map(([name, description]) => ({ name, description, timeout: 0 })),
          ],
        },
      },
      {
        test: {
          name: 'bench',
          include: ['bench/*.spec.ts'],
          environment: 'node',
          // Forks: `run.mjs` hands child output to `process.stderr`, which a
          // worker thread does not have as a real file descriptor.
          pool: 'forks',
          // A book build plus a browser measurement; a bench that measures
          // nothing waits 5 × 60s before saying so.
          testTimeout: 0,
        },
      },
    ],
  },
})
