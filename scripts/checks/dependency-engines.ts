// Asserts that every Node a published package admits, its direct dependencies
// admit too.
//
// `engines.node` is a promise about the whole range, and CI can only run a few
// points of it: `Node floor` and `.node-version`. A dependency whose own range
// has a hole in the middle is invisible at both ends, and npm only warns about
// it unless `engine-strict` is on, which the SvelteKit scaffold writes for the
// reader. So `npm i -D poveste` failed outright on 23.x, 24.0–24.14 and 25.x
// while every job was green (#1075). Comparing the ranges directly needs no
// probe versions to pick and keep current (#916).
//
// A gap that is accepted is recorded with both ranges it lies between, so the
// record goes stale, and says so, the moment either one changes. Recording only
// the dependency's let the floor drop from 24.15.0 to 22.22.2 (#1226) and widen
// the accepted gap to Node 24.0–24.14, which is current LTS, with nothing said.

import type { CheckResult } from './support/check-result.ts'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import semver from 'semver'

const ROOT = join(import.meta.dirname, '..', '..')

export interface Exemption {
  /** The package's own `engines.node` when the gap was accepted. */
  admits: string
  /** The dependency's `engines.node` when the gap was accepted. */
  range: string
  /** Why the Node versions it refuses are acceptable to leave admitted. */
  reason: string
}

/** `<package> -> <dependency>` */
export const EXEMPT: Record<string, Exemption> = {
  'poveste -> jsdom': {
    admits: '>=22.22.2',
    range: '^22.22.2 || ^24.15.0 || >=26.0.0',
    reason: 'It refuses Node 23.x, 24.0–24.14 and 25.x. 23 and 25 are odd-numbered lines past end of life. 24.0–24.14 is current LTS below jsdom\'s own floor, accepted because the floor had to come down to 22.22.2 for StackBlitz (#1226) and the guides tell a Node 24 reader to use 24.15 or later (#1231). `engines.node` cannot carve any of them out: it has to stay a single `>=` floor, or npm walks a Node outside it back to a version that predates the field (#901).',
  },
}

export interface DependencyRange {
  /** The published package, by name. */
  pkg: string
  /** Its `engines.node`. */
  declared: string
  dependency: string
  version: string
  /** The dependency's `engines.node`, or undefined when it declares none. */
  range: string | undefined
}

export interface Walk {
  ranges: DependencyRange[]
  packages: string[]
  unresolved: string[]
}

/** Every Node `declared` admits that `range` refuses, as `semver` says it. */
export function admitsMore(declared: string, range: string): boolean {
  return !semver.subset(declared, range)
}

export function engineProblems(ranges: DependencyRange[], exempt: Record<string, Exemption>): string[] {
  const problems: string[] = []
  const used = new Set<string>()

  for (const { pkg, declared, dependency, version, range } of ranges) {
    if (!range || !admitsMore(declared, range)) {
      continue
    }
    const key = `${pkg} -> ${dependency}`
    const exemption = exempt[key]
    if (exemption && exemption.range === range && exemption.admits === declared) {
      used.add(key)
      continue
    }
    problems.push(!exemption
      ? `${key}: ${pkg} admits Node ${declared}, and ${dependency}@${version} requires ${range}, so a strict install fails on the versions between`
      : exemption.range !== range
        ? `${key}: ${dependency}@${version} now requires Node ${range}, and the recorded exemption was for ${exemption.range}. Re-decide it against the new range`
        : `${key}: ${pkg} now admits Node ${declared}, and the recorded exemption was accepted against ${exemption.admits}. Re-decide it against the new range`)
  }

  for (const key of Object.keys(exempt)) {
    if (!used.has(key) && !problems.some(problem => problem.startsWith(`${key}:`))) {
      problems.push(`${key}: exempted, but the gap is gone. Delete the exemption`)
    }
  }

  return problems
}

/**
 * A dependency's manifest, found the way Node finds the package: `node_modules`
 * upward from the importer. Not `require.resolve('<dep>/package.json')`, which a
 * package's `exports` map refuses unless it lists `./package.json`.
 */
function manifestOf(dependency: string, from: string): any {
  let dir = from
  while (true) {
    const path = join(dir, 'node_modules', dependency, 'package.json')
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf8'))
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return undefined
    }
    dir = parent
  }
}

/**
 * The walk, split from the judging so a spec can point it at a fixture tree.
 * Each dependency is resolved from its own package's directory, which is where
 * Node would look for it.
 */
export function collect(root = ROOT): Walk {
  const ranges: DependencyRange[] = []
  const packages: string[] = []
  const unresolved: string[] = []

  for (const dir of readdirSync(join(root, 'packages'))) {
    let manifest: any
    try {
      manifest = JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'))
    }
    catch {
      continue
    }
    if (manifest.private || !manifest.engines?.node) {
      continue
    }
    packages.push(manifest.name)

    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      const dependencyManifest = manifestOf(dependency, join(root, 'packages', dir))
      if (!dependencyManifest) {
        unresolved.push(`${manifest.name} -> ${dependency}`)
        continue
      }
      ranges.push({
        pkg: manifest.name,
        declared: manifest.engines.node,
        dependency,
        version: dependencyManifest.version,
        range: dependencyManifest.engines?.node,
      })
    }
  }

  return { ranges, packages, unresolved }
}

/**
 * The floor: it read packages and their dependencies. A dependency it could
 * not resolve is reported, since a check that skips what it cannot read passes
 * over exactly the packages it was never run against.
 */
export function walkProblems({ packages, ranges, unresolved }: Walk): string[] {
  const problems = unresolved.map(key => `${key}: could not read the dependency's manifest. Run \`pnpm install\` first`)
  if (packages.length === 0) {
    problems.push('packages/ held no published package with an `engines.node`, so nothing was compared')
  }
  else if (ranges.length === 0) {
    problems.push('the published packages listed no dependencies this could read, so nothing was compared')
  }
  return problems
}

const REMEDY = 'Raise `engines.node` to what the dependency accepts, or record the gap in `EXEMPT` in scripts/checks/dependency-engines.ts with the reason the refused versions can stay admitted.'

export function checkDependencyEngines(root = ROOT): CheckResult {
  const walk = collect(root)
  return {
    problems: [...walkProblems(walk), ...engineProblems(walk.ranges, EXEMPT)],
    remedy: REMEDY,
    notes: [`compared ${walk.ranges.length} direct dependencies across ${walk.packages.length} published packages`],
  }
}
