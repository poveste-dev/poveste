import { describe, expect, it } from 'vitest'
import { unacceptedResolutionProblems, workspaceProtocolDeps } from './check-publishable.ts'

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
