import { describe, expect, it } from 'vitest'
import { emptyFilesEntries, unacceptedResolutionProblems, undeclaredPackedPaths, unsupportedFilesEntries, workspaceProtocolDeps } from './check-publishable.ts'

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
    expect(unacceptedResolutionProblems({})).toEqual([])
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
