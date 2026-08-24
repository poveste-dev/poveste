import type { Context } from '../context.js'
import { describe, expect, it } from 'vitest'
import { noop } from '../virtual/noop.js'
import { resolvedGeneratedGlobalSetup } from '../virtual/resolved-generated-global-setup.js'

function contextFactory(config: Partial<Context['config']> = {}): Context {
  return {
    config,
    supportPlugins: [
      { setupFn: 'setupVanilla' },
      { setupFn: 'setupVue3' },
      { setupFn: ['setupSvelte4', 'setupSvelte5'] },
    ],
  } as Context
}

const SETUP_FN_NAMES = ['setupVanilla', 'setupVue3', 'setupSvelte4', 'setupSvelte5']

// Consumers read these hooks off a namespace import behind a `typeof === 'function'`
// guard. If the module doesn't declare them, Rollup can't resolve the member access
// statically and warns `"setupVue3" is not exported by ...` in every consumer build.
describe('virtual setup modules', () => {
  describe('generated global setup', () => {
    it('should declare every support plugin setup hook when there is no setup code', () => {
      const code = resolvedGeneratedGlobalSetup(contextFactory())

      for (const fnName of SETUP_FN_NAMES) {
        expect(code).toContain(`export const ${fnName} = undefined`)
      }
    })

    it('exports each plugin\'s canonical hook as a real function when there is setup code', () => {
      const code = resolvedGeneratedGlobalSetup(contextFactory({ setupCode: ['export function setupVue3() {}'] }))

      for (const canonical of ['setupVanilla', 'setupVue3', 'setupSvelte4']) {
        expect(code).toContain(`export async function ${canonical} (payload)`)
      }
    })

    // setupSvelte5 is an alias of setupSvelte4. Emitting both as functions made
    // getSetupHook see two interchangeable hooks in poveste's own generated
    // module and warn once per story (#231).
    it('declares alias hooks undefined rather than as functions', () => {
      const code = resolvedGeneratedGlobalSetup(contextFactory({ setupCode: ['export function setupVue3() {}'] }))

      expect(code).toContain('export const setupSvelte5 = undefined')
      expect(code).not.toContain('export async function setupSvelte5 (payload)')
    })
  })

  describe('noop', () => {
    it('should keep the default export and declare every setup hook', () => {
      const code = noop(contextFactory())

      expect(code).toContain('export default () => {}')
      for (const fnName of SETUP_FN_NAMES) {
        expect(code).toContain(`export const ${fnName} = undefined`)
      }
    })
  })
})
