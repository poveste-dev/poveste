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
// `--after-publish` runs it as a release step (#298), and there it substitutes the
// version being released for `latest`: during a publish `latest` is still the
// previous release, so resolving it would vouch for the wrong one and pass (#411).
// The literal `latest` manifest a StackBlitz visitor gets is what every ordinary
// run resolves, where there is no propagation race to lose. It retries after a
// publish, because the new version can take a minute to be resolvable, and it
// reports rather than gates — the packages are already out.

import type { Framework, Manifest } from '../docs/.vitepress/theme/starters.ts'
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { starters } from '../docs/.vitepress/theme/starters.ts'

const run = promisify(execFile)

interface Result {
  framework: Framework
  ok: boolean
  detail: string
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// The one thing the starters do not pin. During a publish `latest` genuinely is
// the previous release, for as long as propagation takes — 60s for v0.8.1 (#401)
// — so this step could install the release before the one it was added to vouch
// for, resolve it cleanly, and report green having never touched the new version
// (#411). `--prefer-online` does not help: the registry's answer is correct and
// current, it is just still the old one.
//
// So after a publish it asks for the version being released by name. The literal
// `latest` manifest a StackBlitz visitor gets is still resolved on every ordinary
// CI run, where there is no race to lose.
export function isPovestePackage(name: string): boolean {
  return name === 'poveste' || name.startsWith('@poveste/')
}

export function pinLatest(manifest: Manifest, version: string): Manifest {
  // Keyed on the package, not on the range: a starter that one day asks for
  // `typescript: latest` must not be handed the poveste version and fail a
  // healthy release with a `notarget` about a package nobody touched.
  const pin = (deps: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(deps).map(([name, range]) =>
      [name, isPovestePackage(name) && range === 'latest' ? version : range]))

  return {
    ...manifest,
    dependencies: pin(manifest.dependencies),
    devDependencies: pin(manifest.devDependencies),
  }
}

// The workspace is checked out at the tag during a release, so its own version is
// the one being published — no need to parse the ref.
export function releasedVersion(): string {
  return JSON.parse(readFileSync(join(ROOT, 'packages/poveste/package.json'), 'utf8')).version
}

// `--prefer-online` matters only after a publish, and matters a lot: the registry
// caches packuments for 300s, so a version published seconds ago can be absent
// from the cached view and resolve as `notarget` (#298). That is still true now
// that the release run asks for an exact version rather than `latest` — the
// cached packument is what would be missing it. Do not drop this flag.
export function installArgs(afterPublish: boolean): string[] {
  const args = ['install', '--dry-run', '--no-audit', '--no-fund']
  return afterPublish ? [...args, '--prefer-online'] : args
}

// Successes are kept, so only what is still failing is retried and a blip in the
// final attempt cannot undo a starter that already resolved.
export function mergeResults(previous: Result[], latest: Result[]): Result[] {
  return previous.map(before => latest.find(after => after.framework === before.framework) ?? before)
}

async function check(framework: Framework, afterPublish = false): Promise<Result> {
  const dir = await mkdtemp(join(tmpdir(), `poveste-starter-${framework}-`))
  try {
    const { manifest } = starters[framework]()
    const resolved = afterPublish ? pinLatest(manifest, releasedVersion()) : manifest
    await writeFile(join(dir, 'package.json'), `${JSON.stringify(resolved, null, 2)}\n`)

    const { stdout } = await run(
      'npm',
      installArgs(afterPublish),
      {
        cwd: dir,
        env: { ...process.env, npm_config_update_notifier: 'false' },
        timeout: 5 * 60_000,
        // An ERESOLVE report runs well past execFile's 1 MiB default.
        maxBuffer: 32 * 1024 * 1024,
      },
    )
    const packages = /added (\d+) package/.exec(stdout)?.[1] ?? '?'
    const asked = afterPublish ? ` for ${releasedVersion()}` : ''
    return { framework, ok: true, detail: `resolves${asked}, ${packages} packages` }
  }
  catch (error) {
    const { stderr, message } = error as { stderr?: string, message: string }
    return { framework, ok: false, detail: (stderr || message).trim() }
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  const afterPublish = process.argv.includes('--after-publish')
  const attempts = afterPublish ? 4 : 1

  let results: Result[] = []
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const pending = attempt === 1
      ? (Object.keys(starters) as Framework[])
      : results.filter(r => !r.ok).map(r => r.framework)

    if (attempt > 1) {
      console.log(`\nRetrying ${pending.join(', ')} (${attempt}/${attempts}) — \`latest\` may still be catching up.`)
      await new Promise(resolve => setTimeout(resolve, 20_000))
    }

    const round: Result[] = []
    for (const framework of pending) {
      console.log(`▸ ${framework}`)
      const result = await check(framework, afterPublish)
      console.log(`  ${result.ok ? '✓' : '✗'} ${result.detail.replaceAll('\n', '\n    ')}`)
      round.push(result)
    }
    results = attempt === 1 ? round : mergeResults(results, round)

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
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
