import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import process from 'node:process'
import { dirname, join } from 'pathe'
import { declaresKit } from './kit-assets.js'

/**
 * Runs `svelte-kit sync` in a SvelteKit project, as Kit's own dev server does on
 * start. That runs in the middleware poveste removes, and Kit 3 writes its result
 * under `node_modules/$app`, which `npm install <package>` deletes: a project that
 * had just installed poveste could not start its dev server (#1200).
 *
 * Returns why it could not run, for the caller to report; a failed sync is the
 * project's to fix, and the book may still start without it.
 */
export function syncSvelteKit(cwd: string): string | undefined {
  if (!declaresKit(cwd)) {
    return undefined
  }
  let cli: string
  try {
    const manifestPath = createRequire(join(cwd, 'package.json')).resolve('@sveltejs/kit/package.json')
    const { bin } = JSON.parse(readFileSync(manifestPath, 'utf8'))
    cli = join(dirname(manifestPath), typeof bin === 'string' ? bin : bin['svelte-kit'])
  }
  catch {
    return '@sveltejs/kit is declared but could not be resolved from the project'
  }
  const result = spawnSync(process.execPath, [cli, 'sync'], { cwd, encoding: 'utf8' })
  return result.status === 0 ? undefined : (result.stderr || result.error?.message || `exited with ${result.status}`).trim()
}
