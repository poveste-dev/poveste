// Post-publish gate: `pnpm -r publish` reported success for a package the
// registry never recorded, and v0.7.0 went green without @poveste/plugin-vue
// (#327). Every other release check runs on the tarballs before they are sent;
// this one asks the registry what actually arrived.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { publishablePackages } from './check-publishable.ts'

interface Release { name: string, version: string }

// 'present', 'missing', or the reason the answer is unknown.
export type Probe = (name: string, version: string) => string

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// Releases the registry cannot account for. Only the still-unaccounted-for are
// retried — propagation is real, just far shorter than the ten minutes the
// v0.7.0 gap lasted — and every one is reported, so recovery is a single
// operation rather than one per run.
export function unpublishedReleases(
  releases: Release[],
  probe: Probe,
  { attempts = 5, waitMs = 6_000, sleep = sleepSync } = {},
): string[] {
  let pending = releases
  let problems: string[] = []

  for (let attempt = 1; attempt <= attempts && pending.length > 0; attempt++) {
    if (attempt > 1) {
      sleep(waitMs)
    }
    const unresolved: Release[] = []
    problems = []
    for (const release of pending) {
      const result = probe(release.name, release.version)
      if (result === 'present') {
        continue
      }
      unresolved.push(release)
      problems.push(`${release.name}@${release.version} ${result === 'missing'
        ? 'is not on the registry'
        : `could not be verified: ${result}`}`)
    }
    pending = unresolved
  }

  return problems
}

// `--prefer-online` is load-bearing, not a tweak: the registry serves packuments
// with `max-age=300`, and the pre-publish preflight has already cached every one
// of them. Without revalidation this reads a five-minute-old view of the
// registry and calls a version that just published missing (#327).
export function probeArgs(name: string, version: string): string[] {
  return ['view', `${name}@${version}`, 'version', '--prefer-online']
}

function npmProbe(name: string, version: string): string {
  try {
    const out = String(execFileSync('npm', probeArgs(name, version), {
      stdio: ['ignore', 'pipe', 'pipe'],
    })).trim()
    // A silent success is not a confirmation.
    return out ? 'present' : 'missing'
  }
  catch (err: any) {
    const stderr = String(err.stderr ?? '')
    if (/E404/.test(stderr)) {
      return 'missing'
    }
    return stderr.split('\n').find((line: string) => line.includes('npm error'))?.trim() || err.message
  }
}

function main(): void {
  const releases: Release[] = publishablePackages().map(pkg => ({
    name: pkg.name,
    version: JSON.parse(readFileSync(join(pkg.dir, 'package.json'), 'utf8')).version,
  }))

  const problems = unpublishedReleases(releases, npmProbe)
  if (problems.length > 0) {
    console.error(`::error::${problems.length} of ${releases.length} packages did not reach npm`)
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    // `npm publish` is the wrong move: it does not rewrite pnpm's `workspace:`
    // protocol, which is what turned 0.6.0 into 0.6.1 with three uninstallable
    // packages. Re-running skips what already published as a duplicate.
    console.error('\nRe-run this release job. Do NOT `npm publish` by hand.')
    process.exit(1)
  }

  console.log(`✅ All ${releases.length} packages reached the registry at their released version`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
