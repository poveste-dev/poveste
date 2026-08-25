import { describe, expect, it } from 'vitest'
import { workspaceProtocolDeps } from './check-publishable.ts'

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
