// Post-publish gate: `pnpm -r publish` reported success for a package the
// registry never recorded, and v0.7.0 went green without @poveste/plugin-vue
// (#327). Every other release check runs on the tarballs before they are sent;
// this one asks the registry what actually arrived.
//
// It asks three things, because a version on the registry is not a release anyone
// installs: `latest` is what the starters and the install instructions resolve,
// and nothing read it after #419 pinned the starter check by version (#427). And
// the packument lists a version minutes before its tarball downloads: 0.18.0's
// release email went out while `@poveste/plugin-vue`'s still answered 404 (#1227).
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

import type { CheckResult } from './support/check-result.ts'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { walkPackages, walkProblems } from './publishable.ts'

interface Release { name: string, version: string }

// 'present', 'missing', `untagged:<tag>:<version it points at>`,
// `tarball:<status>:<url>`, or the reason the answer is unknown.
export type Probe = (name: string, version: string) => string

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// The wait doubles up to a ceiling, so a release that propagates in seconds still
// exits in seconds while a slow one is tolerated. A flat 6s x 5 gave up 31s before
// v0.8.1's last package landed and failed a release that was entirely healthy
// (#401); the gap this gate exists for (#327) was ten minutes and never resolved.
export function backoffMs(attempt: number, waitMs: number, maxWaitMs: number): number {
  return Math.min(maxWaitMs, waitMs * 2 ** (attempt - 2))
}

// Releases the registry cannot account for. Only the still-unaccounted-for are
// retried, and every one is reported, so recovery is a single operation rather
// than one per run.
//
// Bounded by a deadline rather than by a number of attempts, because the tail this
// waits out has already moved by a factor of three across five releases — 1m36s to
// 4m46s, `@poveste/plugin-vue` last in all five (#458). Seven attempts came to
// about 3m30s, which covered four of those five; v0.15.0 lost to it again, giving
// up on two packages that were on the registry minutes later. A number of attempts
// is a bet on the shape of that distribution, and a deadline is not: a healthy
// release still exits as soon as the last package answers, and only a genuinely
// missing one waits out the budget before failing with its name.
export function unpublishedReleases(
  releases: Release[],
  probe: Probe,
  { budgetMs = 15 * 60_000, waitMs = 6_000, maxWaitMs = 60_000, sleep = sleepSync } = {},
): string[] {
  let pending = releases
  let problems: string[] = []
  // Time spent waiting, not wall clock: the probes themselves are the registry
  // answering, and a slow answer is not a reason to stop asking.
  let waitedMs = 0

  for (let attempt = 1; pending.length > 0; attempt++) {
    if (attempt > 1) {
      // A non-positive wait would spend no budget and never end the loop, so it
      // means "do not retry" rather than "retry for free".
      const wait = backoffMs(attempt, waitMs, maxWaitMs)
      if (wait <= 0 || waitedMs + wait > budgetMs) {
        break
      }
      sleep(wait)
      waitedMs += wait
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
  if (result.startsWith('tarball:')) {
    const [, status, ...url] = result.split(':')
    return `is on the registry, but its tarball ${url.join(':')} answers ${status}`
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
  return ['view', `${name}@${version}`, 'dist.tarball', '--prefer-online']
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

// The status a `HEAD` of `url` answers, or why there is none. In a child process
// because the probe is synchronous, like the sleep between attempts.
function headStatus(url: string): string {
  try {
    const script = 'fetch(process.argv[1], { method: "HEAD" }).then(r => process.stdout.write(String(r.status)), (e) => { process.stderr.write(e.message + " (" + (e.cause?.code ?? e.cause?.message) + ")"); process.exit(1) })'
    return String(execFileSync(process.execPath, ['-e', script, url], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 })).trim()
  }
  catch (err: any) {
    return String(err.stderr ?? '').trim() || err.message
  }
}

export function probeRelease(name: string, version: string, view: (args: string[]) => View = npmView, head: (url: string) => string = headStatus): string {
  const published = view(probeArgs(name, version))
  if (published.error) {
    return published.notFound ? 'missing' : published.error
  }
  // A silent success is not a confirmation.
  if (!published.out) {
    return 'missing'
  }

  const tagged = view(tagArgs(name, version))
  if (tagged.error) {
    return `the latest dist-tag could not be read: ${tagged.error}`
  }
  // Reported as pending rather than failed, so the existing backoff absorbs tag
  // propagation the same way it absorbs a tarball's.
  if (tagged.out !== version) {
    return `untagged:${tagFor(version)}:${tagged.out || 'nothing'}`
  }

  // Last, because it is the slowest to arrive: a 404 here is the same tail, and
  // waits in the same backoff.
  const status = head(published.out)
  if (status === '200') {
    return 'present'
  }
  return /^\d{3}$/.test(status) ? `tarball:${status}:${published.out}` : `its tarball could not be fetched: ${status}`
}

function repositoryProblems(root?: string): string[] {
  // The shared walk's floor rather than a second one: this check reads
  // `checks/publishable`'s list, so "it examined something" is a question about
  // that walk. Without it an empty list read as success.
  const walk = walkPackages(root)
  const walked = walkProblems(walk)
  if (walked.length > 0) {
    return ['this check never got a list of packages to ask the registry about', ...walked]
  }

  const releases: Release[] = walk.packages.map(pkg => ({
    name: pkg.name,
    version: JSON.parse(readFileSync(join(pkg.dir, 'package.json'), 'utf8')).version,
  }))

  return unpublishedReleases(releases, probeRelease)
}

const REMEDY = 'Re-run this release job. Do NOT `npm publish` by hand: it does not rewrite pnpm\'s `workspace:` protocol, which is what turned 0.6.0 into 0.6.1 with three uninstallable packages.'

export function checkPublished(root?: string): CheckResult {
  return { problems: repositoryProblems(root), remedy: REMEDY, notes: [] }
}
