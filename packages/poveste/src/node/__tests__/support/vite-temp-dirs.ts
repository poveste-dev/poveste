import { globSync, rmSync } from 'node:fs'
import path from 'node:path'

const FIXTURES = path.resolve(import.meta.dirname, '..')

/** The half-written dependency bundles Vite left in this suite's fixtures. */
export function viteTempDirs(root = FIXTURES): string[] {
  return globSync('*/node_modules/.pvt-vite*/*_temp_*', { cwd: root }).map(dir => path.join(root, dir))
}

/**
 * A server closed during Vite's first dependency scan still finishes the scan,
 * and the scan then starts a bundle that nothing cancels or commits, so its
 * `deps_temp_*` stays: about 25 MB each, seven a run, until a disk filled
 * (#1325). Vite sweeps them a day later; a day of runs is too many.
 *
 * A global teardown, so every worker has exited and nothing still writes into one.
 */
export function teardown(): void {
  for (const dir of viteTempDirs()) {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 })
  }
}
