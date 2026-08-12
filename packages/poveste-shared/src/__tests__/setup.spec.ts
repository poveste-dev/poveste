import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSetupHook } from '../setup.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getSetupHook', () => {
  it('reads a hook by a single name', () => {
    const hook = () => {}
    expect(getSetupHook({ setupVanilla: hook }, 'setupVanilla')).toBe(hook)
  })

  it('ignores a non-function export of the right name', () => {
    expect(getSetupHook({ setupVanilla: 'not a function' }, 'setupVanilla')).toBeUndefined()
    expect(getSetupHook({ setupVanilla: undefined }, 'setupVanilla')).toBeUndefined()
  })

  it('tolerates a missing module', () => {
    expect(getSetupHook(undefined, 'setupVanilla')).toBeUndefined()
  })

  it.each([
    ['the established name', 'setupVue3'],
    ['the unnumbered alias', 'setupVue'],
  ])('finds a hook exported under %s', (_label, name) => {
    const hook = () => {}
    expect(getSetupHook({ [name]: hook }, ['setupVue3', 'setupVue'])).toBe(hook)
  })

  it('returns undefined when none of the names are exported', () => {
    expect(getSetupHook({ setupSvelte5: () => {} }, ['setupVue3', 'setupVue'])).toBeUndefined()
  })

  describe('when a setup file exports more than one alias', () => {
    // The whole point of the alias is that existing files keep working, so the
    // established name has to win regardless of the order they are declared in.
    it('runs the earlier name in the list, not the first declared', () => {
      const legacy = () => {}
      const renamed = () => {}
      expect(getSetupHook({ setupVue: renamed, setupVue3: legacy }, ['setupVue3', 'setupVue'])).toBe(legacy)
    })

    it('warns, naming which one actually runs', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      getSetupHook({ setupVue3: () => {}, setupVue: () => {} }, ['setupVue3', 'setupVue'])

      expect(warn).toHaveBeenCalledOnce()
      const message = warn.mock.calls[0][0] as string
      expect(message).toContain('setupVue3, setupVue')
      expect(message).toContain('Only setupVue3 runs')
    })

    it('stays quiet when only one is exported', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      getSetupHook({ setupVue: () => {} }, ['setupVue3', 'setupVue'])
      expect(warn).not.toHaveBeenCalled()
    })
  })
})
