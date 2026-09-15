import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { tree } from '../fixture-tree.ts'
import { checkPublishable, emptyFilesEntries, packageTableProblems, publishablePackages, rootFromArgv, unacceptedResolutionProblems, undeclaredPackedPaths, unsupportedFilesEntries, walkPackages, walkProblems, workspaceProtocolDeps } from './publishable.ts'

interface AttwProblem { kind: string, entrypoint: string, resolutionKind: string }

// attw groups findings by kind and repeats the kind inside each entry.
function attwReport(...problems: AttwProblem[]): Record<string, AttwProblem[]> {
  const report: Record<string, AttwProblem[]> = {}
  for (const problem of problems) {
    report[problem.kind] ??= []
    report[problem.kind].push(problem)
  }
  return report
}

describe('workspaceProtocolDeps', () => {
  it('flags every dependency still using the workspace: protocol', () => {
    const manifest = {
      dependencies: { '@poveste/shared': 'workspace:^', 'globby': '^14.0.0' },
      peerDependencies: { poveste: 'workspace:*' },
      optionalDependencies: { '@poveste/vendors': 'workspace:~' },
    }

    const offenders = workspaceProtocolDeps(manifest)

    expect(offenders).toEqual([
      'dependencies.@poveste/shared = workspace:^',
      'peerDependencies.poveste = workspace:*',
      'optionalDependencies.@poveste/vendors = workspace:~',
    ])
  })

  it('returns nothing for a manifest pnpm has rewritten to real ranges', () => {
    const manifest = {
      dependencies: { '@poveste/shared': '^0.6.1', 'globby': '^14.0.0' },
      peerDependencies: { poveste: '^0.6.1' },
    }

    const offenders = workspaceProtocolDeps(manifest)

    expect(offenders).toEqual([])
  })

  it('returns nothing for a manifest with no dependency blocks', () => {
    expect(workspaceProtocolDeps({})).toEqual([])
  })
})

describe('unacceptedResolutionProblems', () => {
  it('flags a published entrypoint that resolves to nothing', () => {
    // @poveste/shared/client-node, #302.
    const report = attwReport({ kind: 'NoResolution', entrypoint: './client-node', resolutionKind: 'node10' })

    const offenders = unacceptedResolutionProblems(report)

    expect(offenders).toEqual(['./client-node — NoResolution under node10'])
  })

  it('flags an entrypoint whose declarations import something unresolvable', () => {
    // plugin-vue's extensionless relative specifiers, #302.
    const report = attwReport({ kind: 'InternalResolutionError', entrypoint: './client', resolutionKind: 'node16-esm' })

    const offenders = unacceptedResolutionProblems(report)

    expect(offenders).toEqual(['./client — InternalResolutionError under node16-esm'])
  })

  it('accepts CJSResolvesToESM, since the packages are ESM-only', () => {
    const report = attwReport({ kind: 'CJSResolvesToESM', entrypoint: '.', resolutionKind: 'node16-cjs' })

    const offenders = unacceptedResolutionProblems(report)

    expect(offenders).toEqual([])
  })

  it('accepts NoResolution on a *-dev entrypoint, which points at TypeScript source', () => {
    const report = attwReport({ kind: 'NoResolution', entrypoint: './client-dev', resolutionKind: 'node10' })

    const offenders = unacceptedResolutionProblems(report)

    expect(offenders).toEqual([])
  })

  it('still flags a normal entrypoint reported alongside an accepted -dev one', () => {
    const report = attwReport(
      { kind: 'NoResolution', entrypoint: './collect-dev', resolutionKind: 'node10' },
      { kind: 'NoResolution', entrypoint: './client', resolutionKind: 'node10' },
    )

    const offenders = unacceptedResolutionProblems(report)

    expect(offenders).toEqual(['./client — NoResolution under node10'])
  })

  it('reports nothing when attw found no problems', () => {
    expect(unacceptedResolutionProblems({})).toHaveNoProblems()
  })
})

describe('undeclaredPackedPaths', () => {
  it('flags a packed path that no files entry accounts for', () => {
    const paths = ['dist/index.js', 'src/index.ts']

    const undeclared = undeclaredPackedPaths(paths, ['dist'])

    expect(undeclared).toEqual(['src/index.ts'])
  })

  it('treats a files entry as a directory prefix', () => {
    const paths = ['dist/node/index.js', 'dist/client/client.js']

    expect(undeclaredPackedPaths(paths, ['dist'])).toEqual([])
  })

  it('accepts a file npm ships whatever files says', () => {
    const paths = ['package.json', 'README.md', 'LICENSE']

    expect(undeclaredPackedPaths(paths, ['dist'])).toEqual([])
  })

  it('grants no coverage from a negated entry, which only subtracts', () => {
    const paths = ['dist/index.js', 'src/index.ts']

    expect(undeclaredPackedPaths(paths, ['dist', '!dist/**/*.map'])).toEqual(['src/index.ts'])
  })

  it('accepts an entry naming a single file', () => {
    const paths = ['bin.mjs', 'client.d.ts']

    expect(undeclaredPackedPaths(paths, ['bin.mjs', 'client.d.ts'])).toEqual([])
  })

  it('ignores a leading ./ and a trailing slash on an entry', () => {
    const paths = ['dist/index.js']

    expect(undeclaredPackedPaths(paths, ['./dist/'])).toEqual([])
  })
})

describe('emptyFilesEntries', () => {
  it('flags an entry that ships nothing, as a rename leaves behind', () => {
    // plugin-nuxt's `runtime` is load-bearing and reached at runtime, not
    // imported, so nothing else would notice it stopped shipping.
    const paths = ['dist/index.js']

    const empty = emptyFilesEntries(paths, ['dist', 'runtime-renamed'])

    expect(empty).toEqual(['runtime-renamed'])
  })

  it('passes entries that all match something packed', () => {
    const paths = ['dist/index.js', 'runtime/composables.mjs', 'bin.mjs']

    expect(emptyFilesEntries(paths, ['dist', 'runtime', 'bin.mjs'])).toEqual([])
  })

  it('never expects a negated entry to ship anything', () => {
    const paths = ['dist/index.js']

    expect(emptyFilesEntries(paths, ['dist', '!dist/**/*.map'])).toEqual([])
  })
})

describe('unsupportedFilesEntries', () => {
  it('flags a positive glob, which this matcher cannot judge', () => {
    expect(unsupportedFilesEntries(['dist', 'lib/**/*.js'])).toEqual(['lib/**/*.js'])
  })

  it('passes a negated glob, which only subtracts', () => {
    expect(unsupportedFilesEntries(['dist', '!dist/**/*.map'])).toEqual([])
  })

  it('passes plain paths', () => {
    expect(unsupportedFilesEntries(['dist', 'bin.mjs'])).toEqual([])
  })
})

describe('packageTableProblems', () => {
  const row = (name: string, note = '') => `| [${name}](./packages/${name.replace('@poveste/', 'poveste-')}) | Something${note} |`
  const all = ['poveste', '@poveste/plugin-quasar', '@poveste/controls-stories']
  const published = ['poveste', '@poveste/plugin-quasar']

  it('catches a published package the table omits', () => {
    const table = [row('poveste'), row('@poveste/controls-stories', ' — **not published**')].join('\n')

    expect(packageTableProblems(table, published, all)).toEqual([
      'CONTRIBUTING.md\'s package table omits @poveste/plugin-quasar, which is published',
    ])
  })

  // A private package may be listed — a contributor still meets it — but the
  // table must not imply it ships.
  it('catches a private package listed without the marker', () => {
    const table = [row('poveste'), row('@poveste/plugin-quasar'), row('@poveste/controls-stories')].join('\n')

    expect(packageTableProblems(table, published, all)).toEqual([
      `CONTRIBUTING.md's package table lists @poveste/controls-stories without marking it "not published"`,
    ])
  })

  it('accepts a table that is right', () => {
    const table = [
      row('poveste'),
      row('@poveste/plugin-quasar'),
      row('@poveste/controls-stories', ' — **not published**'),
    ].join('\n')

    expect(packageTableProblems(table, published, all)).toHaveNoProblems()
  })

  it('catches a row naming a package that does not exist', () => {
    const table = [row('poveste'), row('@poveste/plugin-quasar'), row('@poveste/plugin-solid')].join('\n')

    expect(packageTableProblems(table, published, all)).toContainEqual(
      'CONTRIBUTING.md\'s package table lists @poveste/plugin-solid, which is not a package in this repo',
    )
  })

  // Reported rather than passing vacuously: a reformatted table would otherwise
  // switch the guard off without failing anything.
  it('reports a table that has gone missing', () => {
    expect(packageTableProblems('# Contributing\n\nNo table.', published, all)).toHaveLength(1)
  })
})

// Everything above asserts predicates against strings. Nothing above opens a
// file — which is the gap (#719), and it is widest here: three other checks
// import `publishablePackages`, so this one walk decides what
// `checks/doc-coverage`, `checks/package-tests` and `checks/published` examine.

function manifest(name: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ name, version: '1.0.0', ...extra })
}

describe('walkPackages', () => {
  it('selects a package that declares a name and is not private', () => {
    const root = tree({ 'packages/one/package.json': manifest('@poveste/one') })

    expect(walkPackages(root).packages).toEqual([
      { name: '@poveste/one', dir: join(root, 'packages', 'one') },
    ])
  })

  it('sorts by name so a directory rename cannot reorder the list', () => {
    const root = tree({
      'packages/zeta/package.json': manifest('@poveste/a'),
      'packages/alpha/package.json': manifest('@poveste/z'),
    })

    expect(walkPackages(root).packages.map(pkg => pkg.name)).toEqual(['@poveste/a', '@poveste/z'])
  })

  // Rejections are reported rather than dropped, because the failure worth
  // catching is a package leaving the list — and a list cannot say what is no
  // longer on it.
  it('says why it passed over each entry it did not select', () => {
    const root = tree({
      'packages/kept/package.json': manifest('@poveste/kept'),
      'packages/hidden/package.json': manifest('@poveste/hidden', { private: true }),
      'packages/nameless/package.json': JSON.stringify({ version: '1.0.0' }),
      'packages/not-a-package/README.md': 'no manifest here',
    })

    expect(walkPackages(root).skipped).toEqual([
      { dir: 'hidden', reason: 'private' },
      { dir: 'nameless', reason: 'its manifest declares no name' },
      { dir: 'not-a-package', reason: 'no readable package.json' },
    ])
  })

  // The property the accounting rests on, asserted against a real directory
  // rather than against a `Walk` typed by hand: every entry leaves the walk
  // either selected or explained. A refactor that drops one on the floor fails
  // here, which a spec built from a literal cannot notice.
  it('leaves no entry unaccounted for, whatever kind it is', () => {
    const root = tree({
      'packages/kept/package.json': manifest('@poveste/kept'),
      'packages/hidden/package.json': manifest('@poveste/hidden', { private: true }),
      'packages/nameless/package.json': JSON.stringify({ version: '1.0.0' }),
      'packages/not-a-package/README.md': 'no manifest here',
    })

    const walk = walkPackages(root)

    expect(walk.packages.length + walk.skipped.length).toBe(walk.entries.length)
    expect(walkProblems(walk)).toHaveNoProblems()
  })

  it('counts every entry it walked, selected or not', () => {
    const root = tree({
      'packages/one/package.json': manifest('@poveste/one'),
      'packages/two/package.json': manifest('@poveste/two', { private: true }),
    })

    expect(walkPackages(root).entries).toHaveLength(2)
  })
})

describe('walkProblems', () => {
  it('is silent when every entry is either selected or explained', () => {
    const root = tree({
      'packages/one/package.json': manifest('@poveste/one'),
      'packages/hidden/package.json': manifest('@poveste/hidden', { private: true }),
    })

    expect(walkProblems(walkPackages(root))).toHaveNoProblems()
  })

  it('fails when packages/ holds nothing at all', () => {
    const root = tree({ 'CONTRIBUTING.md': '', 'packages/.keep': '' })

    expect(walkProblems({ packages: [], skipped: [], entries: [] })).toEqual([
      expect.stringContaining('held nothing to walk'),
    ])
    expect(walkProblems(walkPackages(root))).not.toEqual([])
  })

  // The floor "it examined at least one thing" passes this, which is why it is
  // not the assertion. One package leaving the list is the realistic drift, and
  // it leaves `checks/package-tests` and `checks/doc-coverage` green over a
  // package they have stopped examining.
  //
  // Built by hand rather than from `walkPackages`, because the walk cannot
  // produce this state: every path selects or records a skip. That is the
  // point — the assertion is a tripwire for the next filter, and this is the
  // only way to show it armed.
  it('fails when an entry is neither selected nor skipped for a reason', () => {
    expect(walkProblems({
      packages: [{ name: '@poveste/one', dir: '/tmp/one' }],
      skipped: [],
      entries: ['one', 'two'],
    })).toEqual([expect.stringContaining('accounted for 1 of 2')])
  })
})

// Offline, because packing and resolving is what a fixture tree can exercise;
// asking the registry about `@fixture/one` cannot come back clean.
describe('checkPublishable', () => {
  const check = (root: string) => checkPublishable(root, { offline: true })

  const book = () => ({
    'CONTRIBUTING.md': '| Package | What |\n| --- | --- |\n| [@fixture/one](./packages/one) | the only one |\n',
    'packages/one/package.json': manifest('@fixture/one', { type: 'module', files: ['index.js'], exports: { '.': './index.js' } }),
    'packages/one/index.js': 'export const one = 1\n',
  })

  it('finds nothing over a tree where everything it asserts holds', () => {
    expect(check(tree(book()))).toHaveNoProblems()
  }, 30_000)

  // An empty list is also what a check that examined nothing returns, so the
  // pair is the assertion: this proves a problem can still be found.
  it('reports a package the table omits', () => {
    const root = tree({
      ...book(),
      'packages/two/package.json': manifest('@fixture/two', { type: 'module', files: ['index.js'], exports: { '.': './index.js' } }),
      'packages/two/index.js': 'export const two = 2\n',
    })

    expect(check(root)).toContainEqual(expect.stringContaining('@fixture/two'))
  }, 30_000)

  it('every publishable package exists on the registry, packs and resolves', { tags: ['check', 'release', 'build', 'network'] }, () => {
    expect(checkPublishable()).toHaveNoProblems('Fix these before tagging: a tag cannot be moved once the GitHub release and half the registry refer to it.')
  })

  it('every publishable package packs and resolves, without asking the registry', { tags: ['check', 'release', 'build'] }, () => {
    expect(checkPublishable(undefined, { offline: true })).toHaveNoProblems('Fix these before tagging: a tag cannot be moved once the GitHub release and half the registry refer to it.')
  })
})

describe('rootFromArgv', () => {
  it('reads the path after --root', () => {
    expect(rootFromArgv(['node', 'check.ts', '--offline', '--root', '/tmp/fixture'])).toBe('/tmp/fixture')
  })

  it('is undefined when the flag is absent, so the real tree stays the default', () => {
    expect(rootFromArgv(['node', 'check.ts', '--offline'])).toBeUndefined()
  })
})

// The point of parameterizing the shared walk rather than this one check: the
// three importers become aimable too, with no edit of their own.
describe('the walk the other checks import', () => {
  it('can be pointed at a fixture tree by a caller that never mentions ROOT', () => {
    const root = tree({
      'packages/one/package.json': manifest('@poveste/one'),
      'packages/hidden/package.json': manifest('@poveste/hidden', { private: true }),
    })

    expect(publishablePackages(root).map(pkg => pkg.name)).toEqual(['@poveste/one'])
  })
})
