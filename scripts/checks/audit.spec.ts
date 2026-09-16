import type { Advisory } from './audit.ts'
import { describe, expect, it } from 'vitest'
import { checkAudit, shippedAdvisoryProblems, shippedPackages } from './audit.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const manifest = (name: string, fields: Record<string, unknown> = {}) => JSON.stringify({ name, version: '1.0.0', ...fields })

// Two published packages, one linked to the other, with each kind of edge the
// walk has to tell apart. The first YAML document is pnpm 12's own lock.
const LOCKFILE = `lockfileVersion: '9.0'

importers:
  .:
    packageManagerDependencies:
      pnpm:
        specifier: 12.4.1
        version: 12.4.1

---
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true

importers:
  packages/app:
    dependencies:
      '@fixture/shared':
        specifier: workspace:^
        version: link:../shared
      runtime-dep:
        specifier: ^1.0.0
        version: 1.0.0
      peer-dep:
        specifier: ^2.0.0
        version: 2.0.0
    devDependencies:
      dev-dep:
        specifier: ^3.0.0
        version: 3.0.0
  packages/shared:
    dependencies:
      shared-dep:
        specifier: ^4.0.0
        version: 4.0.0(peer-of-shared@1.0.0)

snapshots:
  runtime-dep@1.0.0:
    dependencies:
      transitive-dep: 5.0.0
    optionalDependencies:
      optional-peer: 6.0.0
  transitive-dep@5.0.0: {}
  optional-peer@6.0.0: {}
  peer-dep@2.0.0: {}
  dev-dep@3.0.0: {}
  shared-dep@4.0.0(peer-of-shared@1.0.0): {}
`

function repository(lockfile = LOCKFILE) {
  return tree({
    'pnpm-lock.yaml': lockfile,
    'packages/app/package.json': manifest('@fixture/app', {
      dependencies: { '@fixture/shared': 'workspace:^', 'runtime-dep': '^1.0.0' },
      peerDependencies: { 'peer-dep': '^2.0.0' },
      devDependencies: { 'dev-dep': '^3.0.0' },
    }),
    'packages/shared/package.json': manifest('@fixture/shared', {
      dependencies: { 'shared-dep': '^4.0.0' },
    }),
  })
}

function advisory(fields: Partial<Advisory> & Pick<Advisory, 'module_name'>): Advisory {
  return {
    github_advisory_id: `GHSA-${fields.module_name}`,
    severity: 'high',
    title: 'a vulnerability',
    findings: [{ version: '1.0.0', paths: [`packages__app>${fields.module_name}`] }],
    ...fields,
  }
}

describe('shippedPackages', () => {
  it('follows runtime dependencies, links and their transitives, and nothing else', () => {
    const root = repository()

    const shipped = shippedPackages(LOCKFILE, root)

    expect([...shipped].sort()).toEqual(['runtime-dep@1.0.0', 'shared-dep@4.0.0', 'transitive-dep@5.0.0'])
  })

  it('leaves out a peer the lockfile lists as a dependency, a dev dependency and an optional peer', () => {
    // The three edges CONTRIBUTING.md names as looking like the answer and not being it.
    const shipped = shippedPackages(LOCKFILE, repository())

    expect(shipped.has('peer-dep@2.0.0')).toBe(false)
    expect(shipped.has('dev-dep@3.0.0')).toBe(false)
    expect(shipped.has('optional-peer@6.0.0')).toBe(false)
  })
})

describe('shippedAdvisoryProblems', () => {
  const shipped = new Set(['runtime-dep@1.0.0'])

  it('reports a high advisory on a shipped version', () => {
    const problems = shippedAdvisoryProblems([advisory({ module_name: 'runtime-dep' })], shipped, {})

    expect(problems).toEqual([expect.stringContaining('high GHSA-runtime-dep in runtime-dep@1.0.0 reaches consumers')])
  })

  it('ignores an advisory on a package no consumer installs', () => {
    const problems = shippedAdvisoryProblems([advisory({ module_name: 'dev-dep' })], shipped, {})

    expect(problems).toEqual([])
  })

  it('ignores a moderate advisory on a shipped package', () => {
    const problems = shippedAdvisoryProblems([advisory({ module_name: 'runtime-dep', severity: 'moderate' })], shipped, {})

    expect(problems).toEqual([])
  })

  it('accepts an advisory named in the accepted list', () => {
    const problems = shippedAdvisoryProblems([advisory({ module_name: 'runtime-dep' })], shipped, { 'GHSA-runtime-dep': 'no patched release (#1)' })

    expect(problems).toEqual([])
  })

  it('reports an accepted advisory that no longer reaches a consumer', () => {
    const problems = shippedAdvisoryProblems([], shipped, { 'GHSA-runtime-dep': 'no patched release (#1)' })

    expect(problems).toEqual([expect.stringContaining('ACCEPTED names GHSA-runtime-dep, which no longer reaches a consumer')])
  })
})

describe('checkAudit', () => {
  it('reports the walk finding nothing rather than passing over it', () => {
    const root = tree({
      'pnpm-lock.yaml': `lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n`,
      'packages/app/package.json': manifest('@fixture/app'),
    })

    expect(checkAudit(root, []).problems).toEqual(['the walk found no shipped packages, so no advisory could have counted'])
  })

  it('no high or critical advisory reaches a consumer', { tags: ['check', 'release', 'network'] }, () => {
    assertNoProblems(checkAudit())
  })
})
