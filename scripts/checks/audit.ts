// Fails on a high or critical advisory in a package a consumer actually installs.
//
// `pnpm audit` reports every advisory in the lockfile, and most of them sit in
// dev tooling and the example books, where no user can reach them. A gate on
// that list is red from the first run and ignored from the second, so this one
// asks the question CONTRIBUTING.md's "Dependency advisories" section says
// matters: is the package in a published package's `dependencies` tree? It
// walks the lockfile the way that section describes, and only an advisory on a
// package in that walk counts (#307).

import type { CheckResult } from './support/check-result.ts'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseAllDocuments } from 'yaml'
import { publishablePackages } from './publishable.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const GATED_SEVERITIES = ['high', 'critical']

/**
 * Shipped advisories that are known and cannot be fixed from here, by GHSA id.
 *
 * An entry is a claim with an issue behind it, and it goes stale the moment the
 * advisory stops reaching a consumer, which fails too.
 */
export const ACCEPTED: Record<string, string> = {
  'GHSA-jmr9-qjv8-65gv': 'extract-zip has no patched release; plugin-screenshot reaches it through capture-website 5, puppeteer 24 and @puppeteer/browsers 2.13, which still depends on it (#569)',
  'GHSA-7pqw-9j4j-h8q3': 'the same extract-zip 2.0.1 as GHSA-jmr9-qjv8-65gv, through the same chain (#569)',
}

interface Lockfile {
  importers?: Record<string, { dependencies?: Record<string, { version: string }> }>
  snapshots?: Record<string, { dependencies?: Record<string, string> }>
}

export interface Advisory {
  github_advisory_id: string
  module_name: string
  severity: string
  title: string
  findings: { version: string, paths: string[] }[]
}

/** `name@1.2.3` from a snapshot key or a resolved version, without the peer suffix. */
function withoutPeers(version: string) {
  return version.replace(/\(.*$/, '')
}

/**
 * Every `name@version` a consumer installs through a published package.
 *
 * Seeded from each published `package.json`'s `dependencies`, never its peers or
 * dev dependencies, because the lockfile lists resolved peers under an importer's
 * `dependencies` too. A `link:` goes to the sibling package's own manifest, and
 * everything after that follows snapshot `dependencies` only: optional peers
 * are filed under `optionalDependencies`, and no consumer has those.
 */
export function shippedPackages(lockfileText: string, root = ROOT): Set<string> {
  // pnpm 12 writes the package manager's own lock as a separate YAML document,
  // with `importers` of its own. The project's is the one carrying `settings`.
  const lockfile = (parseAllDocuments(lockfileText) as { toJS: () => Lockfile & { settings?: unknown } }[])
    .map(document => document.toJS())
    .find(document => document?.settings) ?? {}
  const shipped = new Set<string>()
  const seenImporters = new Set<string>()
  const queue: string[] = []

  function seedImporter(importer: string) {
    if (seenImporters.has(importer)) {
      return
    }
    seenImporters.add(importer)
    const manifest = JSON.parse(readFileSync(join(root, importer, 'package.json'), 'utf8'))
    const resolved = lockfile.importers?.[importer]?.dependencies ?? {}
    for (const name of Object.keys(manifest.dependencies ?? {})) {
      const version = resolved[name]?.version
      if (!version) {
        continue
      }
      if (version.startsWith('link:')) {
        seedImporter(posix.normalize(posix.join(importer, version.slice('link:'.length))))
      }
      else {
        queue.push(`${name}@${version}`)
      }
    }
  }

  for (const pkg of publishablePackages(root)) {
    seedImporter(posix.relative(root.replaceAll('\\', '/'), pkg.dir.replaceAll('\\', '/')))
  }

  const walked = new Set<string>()
  while (queue.length > 0) {
    const key = queue.pop()!
    if (walked.has(key)) {
      continue
    }
    walked.add(key)
    shipped.add(withoutPeers(key))
    for (const [name, version] of Object.entries(lockfile.snapshots?.[key]?.dependencies ?? {})) {
      if (!version.startsWith('link:')) {
        queue.push(`${name}@${version}`)
      }
    }
  }

  return shipped
}

/** Gated advisories on a shipped package, each named with one path that proves it. */
export function shippedAdvisoryProblems(advisories: Advisory[], shipped: Set<string>, accepted: Record<string, string>): string[] {
  const problems: string[] = []
  const reached = new Set<string>()

  for (const advisory of advisories) {
    if (!GATED_SEVERITIES.includes(advisory.severity)) {
      continue
    }
    const finding = advisory.findings.find(f => shipped.has(`${advisory.module_name}@${f.version}`))
    if (!finding) {
      continue
    }
    reached.add(advisory.github_advisory_id)
    if (advisory.github_advisory_id in accepted) {
      continue
    }
    problems.push(`${advisory.severity} ${advisory.github_advisory_id} in ${advisory.module_name}@${finding.version} reaches consumers: ${advisory.title} (via ${finding.paths[0] ?? 'the lockfile'})`)
  }

  for (const id of Object.keys(accepted)) {
    if (!reached.has(id)) {
      problems.push(`ACCEPTED names ${id}, which no longer reaches a consumer — delete the entry`)
    }
  }

  return problems
}

function auditAdvisories(root: string): Advisory[] {
  // Exits non-zero whenever there is anything to report, so the status says
  // nothing; the JSON is the answer.
  const result = spawnSync('pnpm', ['audit', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (result.error) {
    throw result.error
  }
  const report = JSON.parse(result.stdout)
  return Object.values(report.advisories ?? {}) as Advisory[]
}

const REMEDY = 'Bump the parent that pulls the package in, or add a pnpm override. If it cannot be fixed here, add the advisory to ACCEPTED in scripts/checks/audit.ts with the issue that tracks it.'

export function checkAudit(root = ROOT, advisories: Advisory[] = auditAdvisories(root)): CheckResult {
  const shipped = shippedPackages(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'), root)
  if (shipped.size === 0) {
    return { problems: ['the walk found no shipped packages, so no advisory could have counted'], remedy: REMEDY, notes: [] }
  }
  return {
    problems: shippedAdvisoryProblems(advisories, shipped, ACCEPTED),
    remedy: REMEDY,
    notes: [`${shipped.size} packages reach consumers; ${advisories.length} advisories in the lockfile, ${GATED_SEVERITIES.join(' or ')} on a shipped package fails.`],
  }
}
