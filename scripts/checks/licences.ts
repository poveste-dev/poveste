// Fails on a licence outside the allow-list in anything a consumer installs
// through a published package, and on a bundling build that writes no notices.
//
// The two halves are different obligations (#936). What a package bundles is
// redistributed, so its build writes `dist/THIRD_PARTY_NOTICES.md` and refuses a
// licence there itself (`scripts/build/third-party-notices.ts`); this only holds
// every bundling build to carrying that plugin. What a package depends on needs
// recording, not shipping: the walk reads every installed manifest a consumer
// gets, and the notes are that record.

import type { CheckResult } from './support/check-result.ts'
import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBundles, installedPackageDir } from '../build/third-party-notices.ts'
import { declaredLicence, licenceProblem } from '../licences.ts'
import { publishablePackages } from './publishable.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export interface InstalledPackage {
  name: string
  version: string
  licence: string | undefined
}

/**
 * Everything installed with the package at `dir`, transitively: `dependencies`
 * and the `optionalDependencies` that resolve, never peers or dev dependencies.
 *
 * Resolved the way Node does from each package's real location, so it reads
 * what pnpm actually installed. Workspace packages are walked through but not
 * listed: each is published, and checked, on its own.
 */
export function runtimeDependencies(dir: string, root = ROOT): { installed: InstalledPackage[], unresolved: string[] } {
  const workspace = new Set(readdirSync(join(root, 'packages')).map(entry => realpathSync(join(root, 'packages', entry))))
  const seen = new Set<string>()
  const installed = new Map<string, InstalledPackage>()
  const unresolved: string[] = []
  const queue: Array<{ from: string, manifest: Record<string, any> }> = [{ from: dir, manifest: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) }]

  while (queue.length > 0) {
    const { from, manifest } = queue.pop()!
    const edges = [
      ...Object.keys(manifest['dependencies'] ?? {}).map(name => ({ name, optional: false })),
      ...Object.keys(manifest['optionalDependencies'] ?? {}).map(name => ({ name, optional: true })),
    ]
    for (const { name, optional } of edges) {
      const found = installedPackageDir(name, from)
      if (!found) {
        if (!optional) {
          unresolved.push(`${name} (from ${manifest['name']})`)
        }
        continue
      }
      if (seen.has(found)) {
        continue
      }
      seen.add(found)
      const dependency = JSON.parse(readFileSync(join(found, 'package.json'), 'utf8'))
      if (!workspace.has(found)) {
        installed.set(`${dependency.name}@${dependency.version}`, { name: dependency.name, version: dependency.version, licence: declaredLicence(dependency) })
      }
      queue.push({ from: found, manifest: dependency })
    }
  }

  return { installed: [...installed.values()], unresolved }
}

/** A published package whose build bundles, and whose Vite config does not write the notices. */
export function noticesWiringProblems(root = ROOT): string[] {
  return publishablePackages(root).flatMap((pkg) => {
    const manifest = JSON.parse(readFileSync(join(pkg.dir, 'package.json'), 'utf8'))
    if (!buildBundles(manifest)) {
      return []
    }
    const config = readdirSync(pkg.dir).find(file => /^vite\.config\.[cm]?[jt]s$/.test(file))
    if (config && readFileSync(join(pkg.dir, config), 'utf8').includes('thirdPartyNotices(')) {
      return []
    }
    return [`${pkg.name} bundles in its build, and ${config ? relative(root, join(pkg.dir, config)) : 'it has no vite.config'} does not add thirdPartyNotices(), so the code it redistributes ships without notices`]
  })
}

const REMEDY = 'For a dependency: replace it, or add its licence to ALLOWED_LICENCES in scripts/licences.ts with the reason it is acceptable. For a bundling build: add thirdPartyNotices() from scripts/build/third-party-notices.ts to its vite.config.'

export function checkLicences(root = ROOT): CheckResult {
  const problems: string[] = []
  const notes: string[] = []
  const reachedBy = new Map<string, { pkg: InstalledPackage, from: string[] }>()

  const packages = publishablePackages(root)
  if (packages.length === 0) {
    return { problems: ['the walk found no published packages, so no licence could have been read'], remedy: REMEDY, notes }
  }

  for (const pkg of packages) {
    const { installed, unresolved } = runtimeDependencies(pkg.dir, root)
    problems.push(...unresolved.map(name => `${pkg.name} depends on ${name}, which is not installed, so its licence could not be read — run pnpm install`))
    for (const dependency of installed) {
      const key = `${dependency.name}@${dependency.version}`
      const entry = reachedBy.get(key) ?? { pkg: dependency, from: [] }
      entry.from.push(pkg.name)
      reachedBy.set(key, entry)
    }
    const counts = new Map<string, number>()
    for (const dependency of installed) {
      counts.set(dependency.licence ?? '(none)', (counts.get(dependency.licence ?? '(none)') ?? 0) + 1)
    }
    const summary = [...counts].sort((a, b) => b[1] - a[1]).map(([licence, count]) => `${licence} ${count}`).join(', ')
    notes.push(`${pkg.name}: ${installed.length} runtime packages${summary ? ` (${summary})` : ''}`)
  }

  for (const [key, { pkg, from }] of reachedBy) {
    const problem = licenceProblem(pkg.licence)
    if (problem) {
      problems.push(`${key} ${problem}; a consumer installs it through ${from.join(', ')}`)
    }
  }

  problems.push(...noticesWiringProblems(root))
  return { problems, remedy: REMEDY, notes }
}
