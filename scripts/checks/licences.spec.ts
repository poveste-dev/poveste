import { describe, expect, it } from 'vitest'
import { checkLicences, noticesWiringProblems, runtimeDependencies } from './licences.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const manifest = (name: string, fields: Record<string, unknown> = {}) => JSON.stringify({ name, version: '1.0.0', license: 'MIT', ...fields })

// One published package, installed the way a flat node_modules lays it out,
// with each kind of edge the walk has to tell apart.
function repo(transitiveLicence = 'MIT') {
  return tree({
    'packages/app/package.json': manifest('@fixture/app', {
      dependencies: { direct: '^1.0.0' },
      optionalDependencies: { 'platform-only': '^1.0.0', 'other-platform': '^1.0.0' },
      peerDependencies: { peer: '^1.0.0' },
      devDependencies: { tooling: '^1.0.0' },
      scripts: { build: 'tsc' },
    }),
    'node_modules/direct/package.json': manifest('direct', { dependencies: { transitive: '^1.0.0' } }),
    'node_modules/transitive/package.json': manifest('transitive', { license: transitiveLicence }),
    'node_modules/platform-only/package.json': manifest('platform-only'),
    'node_modules/peer/package.json': manifest('peer', { license: 'GPL-3.0-only' }),
    'node_modules/tooling/package.json': manifest('tooling', { license: 'GPL-3.0-only' }),
  })
}

describe('runtimeDependencies', () => {
  it('walks dependencies and the optional ones installed, never peers or dev dependencies', () => {
    const root = repo()

    const { installed, unresolved } = runtimeDependencies(`${root}/packages/app`, root)

    expect(installed.map(pkg => pkg.name).sort()).toEqual(['direct', 'platform-only', 'transitive'])
    expect(unresolved).toEqual([])
  })
})

describe('checkLicences', () => {
  // Under `packages/` by path, but a dependency: only a workspace package's own directory is skipped.
  it('names a dependency installed inside a package\'s own node_modules', () => {
    const root = tree({
      'packages/app/package.json': manifest('@fixture/app', { dependencies: { inner: '^1.0.0' } }),
      'packages/app/node_modules/inner/package.json': manifest('inner', { license: 'GPL-3.0-only' }),
    })

    expect(checkLicences(root).problems).toEqual(['inner@1.0.0 is licensed GPL-3.0-only, which is not in the allow-list; a consumer installs it through @fixture/app'])
  })

  it('names a dependency outside the allow-list and the package a consumer installs it through', () => {
    const root = repo('GPL-3.0-only')

    expect(checkLicences(root).problems).toEqual(['transitive@1.0.0 is licensed GPL-3.0-only, which is not in the allow-list; a consumer installs it through @fixture/app'])
  })

  it('reports each package\'s runtime licences whether it passes or not', () => {
    expect(checkLicences(repo()).notes).toEqual(['@fixture/app: 3 runtime packages (MIT 3)'])
  })

  it('reports finding no published package rather than passing over it', () => {
    const root = tree({ 'packages/private/package.json': manifest('@fixture/private', { private: true }) })

    expect(checkLicences(root).problems).toEqual(['the walk found no published packages, so no licence could have been read'])
  })

  it('every runtime licence is allowed, and every bundling build writes notices', { tags: ['check', 'release'] }, () => {
    assertNoProblems(checkLicences())
  })
})

describe('noticesWiringProblems', () => {
  it('names a bundling build whose vite config writes no notices', () => {
    const root = tree({
      'packages/lib/package.json': manifest('@fixture/lib', { scripts: { build: 'rimraf dist && vite build' } }),
      'packages/lib/vite.config.ts': 'export default {}',
    })

    expect(noticesWiringProblems(root)).toEqual(['@fixture/lib bundles in its build, and packages/lib/vite.config.ts does not add thirdPartyNotices(), so the code it redistributes ships without notices'])
  })

  it('accepts one that does, and a build that only compiles', () => {
    const root = tree({
      'packages/lib/package.json': manifest('@fixture/lib', { scripts: { build: 'vite build' } }),
      'packages/lib/vite.config.ts': 'export default { plugins: [thirdPartyNotices({ packageName: \'@fixture/lib\' })] }',
      'packages/tsc/package.json': manifest('@fixture/tsc', { scripts: { build: 'tsc -d' } }),
    })

    expect(noticesWiringProblems(root)).toEqual([])
  })
})
