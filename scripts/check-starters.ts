// Resolves every "Try it live" StackBlitz starter against the real npm
// registry.
//
// The starters install with npm inside a WebContainer; this workspace installs
// with pnpm, and `pnpm-workspace.yaml` sets `peerDependencyRules
// .allowedVersions.vite: ^8.0.0`. That override lets an example depend on a
// plugin whose declared peer range stops at Vite 7 and install anyway. npm has
// no such override and fails outright with ERESOLVE — so a fully green CI is
// compatible with all three starters being uninstallable. That is #73, which
// only surfaced because someone filed it by hand.
//
// `npm install --dry-run` performs the full resolution and exits non-zero on
// ERESOLVE, so it is enough — nothing is downloaded or built. The manifests
// come from `docs/.vitepress/theme/starters.ts` rather than being restated
// here; duplicating the versions would just move the staleness.
//
// Needs network, and resolves `latest` against what is published right now.
//
// `--after-publish` runs it as a release step (#298). Before a release `latest`
// is still the previous version, so it would vouch for the wrong one; straight
// after, it is the only check that installs the published set the way a user
// does. It retries there, because `latest` can lag the publish by seconds, and
// it reports rather than gates — the packages are already out.

import type { Framework } from '../docs/.vitepress/theme/starters.ts'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { starters } from '../docs/.vitepress/theme/starters.ts'

const run = promisify(execFile)

interface Result {
  framework: Framework
  ok: boolean
  detail: string
}

async function check(framework: Framework): Promise<Result> {
  const dir = await mkdtemp(join(tmpdir(), `poveste-starter-${framework}-`))
  try {
    const { manifest } = starters[framework]()
    await writeFile(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

    const { stdout } = await run(
      'npm',
      ['install', '--dry-run', '--no-audit', '--no-fund'],
      {
        cwd: dir,
        env: { ...process.env, npm_config_update_notifier: 'false' },
        timeout: 5 * 60_000,
        // An ERESOLVE report runs well past execFile's 1 MiB default.
        maxBuffer: 32 * 1024 * 1024,
      },
    )
    const packages = /added (\d+) package/.exec(stdout)?.[1] ?? '?'
    return { framework, ok: true, detail: `resolves, ${packages} packages` }
  }
  catch (error) {
    const { stderr, message } = error as { stderr?: string, message: string }
    return { framework, ok: false, detail: (stderr || message).trim() }
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const afterPublish = process.argv.includes('--after-publish')
const attempts = afterPublish ? 4 : 1

let results: Result[] = []
for (let attempt = 1; attempt <= attempts; attempt++) {
  if (attempt > 1) {
    console.log(`\nRetrying (${attempt}/${attempts}) — \`latest\` may still be catching up.`)
    await new Promise(resolve => setTimeout(resolve, 20_000))
  }
  results = []
  for (const framework of Object.keys(starters) as Framework[]) {
    console.log(`▸ ${framework}`)
    const result = await check(framework)
    console.log(`  ${result.ok ? '✓' : '✗'} ${result.detail.replaceAll('\n', '\n    ')}`)
    results.push(result)
  }
  if (results.every(r => r.ok)) {
    break
  }
}

const failed = results.filter(r => !r.ok)
if (failed.length) {
  console.error(`\n${failed.length}/${results.length} starters cannot be installed: ${failed.map(r => r.framework).join(', ')}`)
  if (afterPublish) {
    // The versions are live and npm versions are immutable, so there is nothing
    // to fix in place — 0.6.1 is the worked example of the way out.
    console.error('::error::The release that just published cannot be installed.')
    console.error('Cut a patch release with the fix, then `npm deprecate` the broken versions. Do not unpublish.')
  }
  else {
    console.error('Fix the versions in docs/.vitepress/theme/starters.ts.')
  }
  process.exit(1)
}
console.log(`\nAll ${results.length} starters resolve.`)
