// Post-publish gate: `pnpm -r publish` reported success for a package the
// registry never recorded, and v0.7.0 went green without @poveste/plugin-vue
// (#327). Every other release check runs on the tarballs before they are sent;
// this one asks the registry what actually arrived.
//
// It asks two things, because a tarball on the registry is not a release anyone
// installs: `latest` is what the starters and the install instructions resolve,
// and nothing read it after #419 pinned the starter check by version (#427).
//
// Which tag depends on the version. `release.yml` publishes a prerelease to
// `next` and everything else to `latest` (#553), so that is what is asserted.
//
// Prereleases were briefly held to `latest` on purpose, and the reason is worth
// keeping: before #553 the publish passed no `--tag` at all, npm defaulted every
// one to `latest`, and exempting them would have skipped the check in the case
// where a wrong `latest` does the most damage. The exemption is correct now
// because the publish makes it correct, not because `latest` was never supposed
// to follow a prerelease.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { publishablePackages } from './check-publishable.ts'

interface Release { name: string, version: string }

// 'present', 'missing', `untagged:<version latest points at>`, or the reason the
// answer is unknown.
export type Probe = (name: string, version: string) => string

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// The wait doubles up to a ceiling, so a release that propagates in seconds still
// exits in seconds while a slow one is tolerated. A flat 6s x 5 gave up 31s before
// v0.8.1's last package landed and failed a release that was entirely healthy
// (#401); the gap this gate exists for (#327) was ten minutes and never resolved,
// so widening to ~3.5 minutes keeps the two far apart.
export function backoffMs(attempt: number, waitMs: number, maxWaitMs: number): number {
  return Math.min(maxWaitMs, waitMs * 2 ** (attempt - 2))
}

// Releases the registry cannot account for. Only the still-unaccounted-for are
// retried, and every one is reported, so recovery is a single operation rather
// than one per run.
export function unpublishedReleases(
  releases: Release[],
  probe: Probe,
  { attempts = 7, waitMs = 6_000, maxWaitMs = 60_000, sleep = sleepSync } = {},
): string[] {
  let pending = releases
  let problems: string[] = []

  for (let attempt = 1; attempt <= attempts && pending.length > 0; attempt++) {
    if (attempt > 1) {
      sleep(backoffMs(attempt, waitMs, maxWaitMs))
    }
    const unresolved: Release[] = []
    problems = []
    for (const release of pending) {
      const result = probe(release.name, release.version)
      if (result === 'present') {
        continue
      }
      unresolved.push(release)
      problems.push(`${release.name}@${release.version} ${problemFor(result)}`)
    }
    pending = unresolved
  }

  return problems
}

export function problemFor(result: string): string {
  if (result === 'missing') {
    return 'is not on the registry'
  }
  if (result.startsWith('untagged:')) {
    const [tag, points] = result.slice('untagged:'.length).split(':')
    return `is on the registry, but the ${tag} dist-tag still points at ${points}`
  }
  return `could not be verified: ${result}`
}

// `--prefer-online` is load-bearing, not a tweak: the registry serves packuments
// with `max-age=300`, and the pre-publish preflight has already cached every one
// of them. Without revalidation this reads a five-minute-old view of the
// registry and calls a version that just published missing (#327). The tag read
// below needs it for the same reason, and more sharply — during propagation the
// cached packument still names the previous release as `latest`.
export function probeArgs(name: string, version: string): string[] {
  return ['view', `${name}@${version}`, 'version', '--prefer-online']
}

/** The tag `release.yml` publishes this version to. */
export function tagFor(version: string): string {
  return version.includes('-') ? 'next' : 'latest'
}

export function tagArgs(name: string, version: string): string[] {
  return ['view', name, `dist-tags.${tagFor(version)}`, '--prefer-online']
}

interface View { out: string, notFound?: boolean, error?: string }

// One `npm view`, with its own error handling: a shared catch reported a tag
// that could not be read as a tarball that never published, which sends whoever
// is recovering to re-run the publish — the one move this file warns against.
function npmView(args: string[]): View {
  try {
    return { out: String(execFileSync('npm', args, { stdio: ['ignore', 'pipe', 'pipe'] })).trim() }
  }
  catch (err: any) {
    const stderr = String(err.stderr ?? '')
    return {
      out: '',
      notFound: /E404/.test(stderr),
      error: stderr.split('\n').find((line: string) => line.includes('npm error'))?.trim() || err.message,
    }
  }
}

function npmProbe(name: string, version: string): string {
  const published = npmView(probeArgs(name, version))
  if (published.error) {
    return published.notFound ? 'missing' : published.error
  }
  // A silent success is not a confirmation.
  if (!published.out) {
    return 'missing'
  }

  const tagged = npmView(tagArgs(name, version))
  if (tagged.error) {
    return `the latest dist-tag could not be read: ${tagged.error}`
  }
  // Reported as pending rather than failed, so the existing backoff absorbs tag
  // propagation the same way it absorbs a tarball's.
  return tagged.out === version ? 'present' : `untagged:${tagFor(version)}:${tagged.out || 'nothing'}`
}

function main(): void {
  const releases: Release[] = publishablePackages().map(pkg => ({
    name: pkg.name,
    version: JSON.parse(readFileSync(join(pkg.dir, 'package.json'), 'utf8')).version,
  }))

  const problems = unpublishedReleases(releases, npmProbe)
  if (problems.length > 0) {
    console.error(`::error::${problems.length} of ${releases.length} packages are not released at their version`)
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    // `npm publish` is the wrong move: it does not rewrite pnpm's `workspace:`
    // protocol, which is what turned 0.6.0 into 0.6.1 with three uninstallable
    // packages. Re-running skips what already published as a duplicate.
    console.error('\nRe-run this release job. Do NOT `npm publish` by hand.')
    process.exit(1)
  }

  console.log(`✅ All ${releases.length} packages are on the registry with ${tagFor(releases[0].version)} pointing at their released version`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
