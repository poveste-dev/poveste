import { describe, expect, it } from 'vitest'
import { unacceptedResolutionProblems, workspaceProtocolDeps } from './check-publishable.ts'

describe('workspaceProtocolDeps', () => {
  it('flags every dependency still using the workspace: protocol', () => {
    expect(workspaceProtocolDeps({
      dependencies: { '@poveste/shared': 'workspace:^', 'globby': '^14.0.0' },
      peerDependencies: { poveste: 'workspace:*' },
      optionalDependencies: { '@poveste/vendors': 'workspace:~' },
    })).toEqual([
      'dependencies.@poveste/shared = workspace:^',
      'peerDependencies.poveste = workspace:*',
      'optionalDependencies.@poveste/vendors = workspace:~',
    ])
  })

  it('passes a manifest pnpm has rewritten to real ranges', () => {
    expect(workspaceProtocolDeps({
      dependencies: { '@poveste/shared': '^0.6.1', 'globby': '^14.0.0' },
      peerDependencies: { poveste: '^0.6.1' },
    })).toEqual([])
  })

  it('handles a manifest with no dependency blocks', () => {
    expect(workspaceProtocolDeps({})).toEqual([])
  })
})

describe('unacceptedResolutionProblems', () => {
  it('flags a published entrypoint that resolves to nothing', () => {
    // The @poveste/shared/client-node defect from #302.
    expect(unacceptedResolutionProblems({
      NoResolution: [{ kind: 'NoResolution', entrypoint: './client-node', resolutionKind: 'node10' }],
    })).toEqual(['./client-node — NoResolution under node10'])
  })

  it('flags declarations whose imports do not resolve', () => {
    // The plugin-vue .d.ts defect from #302.
    expect(unacceptedResolutionProblems({
      InternalResolutionError: [{ kind: 'InternalResolutionError', entrypoint: './client', resolutionKind: 'node16-esm' }],
    })).toEqual(['./client — InternalResolutionError under node16-esm'])
  })

  it('accepts CJSResolvesToESM, since the packages are ESM-only', () => {
    expect(unacceptedResolutionProblems({
      CJSResolvesToESM: [{ kind: 'CJSResolvesToESM', entrypoint: '.', resolutionKind: 'node16-cjs' }],
    })).toEqual([])
  })

  it('accepts NoResolution on a *-dev entrypoint, which points at TypeScript source', () => {
    expect(unacceptedResolutionProblems({
      NoResolution: [{ kind: 'NoResolution', entrypoint: './client-dev', resolutionKind: 'node10' }],
    })).toEqual([])
  })

  it('still flags NoResolution on a normal entrypoint alongside an accepted -dev one', () => {
    expect(unacceptedResolutionProblems({
      NoResolution: [
        { kind: 'NoResolution', entrypoint: './collect-dev', resolutionKind: 'node10' },
        { kind: 'NoResolution', entrypoint: './client', resolutionKind: 'node10' },
      ],
    })).toEqual(['./client — NoResolution under node10'])
  })

  it('has nothing to report when attw found no problems', () => {
    expect(unacceptedResolutionProblems({})).toEqual([])
  })
})
