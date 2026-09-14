import { describe, expect, it } from 'vitest'
import { removeTrees, tree } from './fixture-tree.ts'
import { didNotRun, runCheck } from './run-check.ts'

describe('didNotRun', () => {
  // The case this exists for. `check-publishable` packs every package and asks
  // `attw` about the result; in a worktree with no install it catches the
  // ENOENT and reports it as a problem, so the check exits 1 and a spec
  // asserting the status fails with `expected 1 to be +0` — which names neither
  // the tool nor the cause.
  it('names the binary a check could not find', () => {
    expect(didNotRun('@poveste/one could not be verified: spawnSync attw ENOENT'))
      .toBe('it shells out to `attw`, which is not on PATH')
  })

  it('recognises an unresolvable import', () => {
    expect(didNotRun('Error [ERR_MODULE_NOT_FOUND]: Cannot find module \'./gone.ts\''))
      .toBe('a module it imports could not be resolved')
  })

  // A check that ran and found something real must not be classified as an
  // environment failure, or a genuine defect would read as a broken worktree.
  it('is undefined for a check that ran and reported a problem', () => {
    expect(didNotRun('❌ Mirrored conformance sets have drifted:\n  • Button.story.vue differs')).toBeUndefined()
  })

  it('is undefined for a clean run', () => {
    expect(didNotRun('✅ 75 conformance stories identical across 3 mirrored pairs')).toBeUndefined()
  })

  // The guarantee that keeps this a diagnostic rather than an assertion about
  // wording: a check is free to reword its own messages. Only the runtime's own
  // vocabulary is matched, and nothing here is a sentence a check author edits.
  it('does not fire on a check that merely mentions a module or a path', () => {
    expect(didNotRun('docs/guide/index.md names a module that no longer exists')).toBeUndefined()
  })
})

describe('runCheck', () => {
  it('returns the status of a check that ran', () => {
    expect(runCheck('check-mirrored-conformance.ts').status).toBe(0)
  })

  it('returns a non-zero status rather than throwing when a check reports a problem', () => {
    const root = tree({
      'CONTRIBUTING.md': '| Package | What |\n| --- | --- |\n| [@fixture/one](./packages/one) | one |\n',
      'packages/one/package.json': JSON.stringify({ name: '@fixture/one', version: '1.0.0', type: 'module', files: ['index.js'], exports: { '.': './index.js' } }),
      'packages/one/index.js': 'export const one = 1\n',
      'packages/two/package.json': JSON.stringify({ name: '@fixture/two', version: '1.0.0', type: 'module', files: ['index.js'], exports: { '.': './index.js' } }),
      'packages/two/index.js': 'export const two = 2\n',
    })

    expect(runCheck('check-publishable.ts', ['--offline', '--root', root]).status).toBe(1)
    removeTrees()
  }, 30_000)

  // A renamed or deleted check is the same event as a missing binary: the
  // process exits non-zero having asserted nothing, and a caller reading the
  // status alone would take that for a verdict.
  it('throws, naming the script, when the check could not run at all', () => {
    expect(() => runCheck('check-does-not-exist.ts')).toThrow(/check-does-not-exist\.ts did not run to a verdict/)
  })

  // Not a skip. A spec that quietly skips when its dependencies are missing is
  // the family of defect #719 is about.
  it('tells the reader what to do rather than skipping', () => {
    expect(() => runCheck('check-does-not-exist.ts')).toThrow(/pnpm install/)
  })
})
