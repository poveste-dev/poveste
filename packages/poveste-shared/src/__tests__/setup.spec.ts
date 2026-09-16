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

  // Proven with a fixture list, because every production list is empty. An empty
  // detector that has only ever been seen to pass cannot be told apart from one
  // that does not work — so the mechanism is exercised here, and 1.0 only has to
  // move a string between two arrays (#157).
  describe('when a setup file exports a name that is no longer read', () => {
    const RETIRED = ['setupSvelte3', 'setupSvelte4']

    it('warns, and names the export it found', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      getSetupHook({ setupSvelte3: () => {} }, ['setupSvelte'], RETIRED)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('setupSvelte3'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no longer read'))
    })

    it('says which name to rename it to, so the message is actionable on its own', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      getSetupHook({ setupSvelte3: () => {} }, ['setupSvelte5', 'setupSvelte'], RETIRED)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Rename to setupSvelte'))
    })

    it('does not run it — a retired name is not a hook', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(getSetupHook({ setupSvelte3: () => {} }, ['setupSvelte'], RETIRED)).toBeUndefined()
    })

    it('names every retired export, not only the first', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      getSetupHook({ setupSvelte3: () => {}, setupSvelte4: () => {} }, ['setupSvelte'], RETIRED)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('setupSvelte3, setupSvelte4'))
    })

    it('still warns when a live hook is present, since the dead export is what misleads', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const live = () => {}

      expect(getSetupHook({ setupSvelte3: () => {}, setupSvelte: live }, ['setupSvelte'], RETIRED)).toBe(live)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('setupSvelte3'))
    })

    it('says nothing when no retired name is exported, which is every case today', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      getSetupHook({ setupSvelte: () => {} }, ['setupSvelte'], RETIRED)

      expect(warn).not.toHaveBeenCalled()
    })

    it('says nothing when the retired list is empty, which is what ships', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      getSetupHook({ setupSvelte3: () => {} }, ['setupSvelte'])

      expect(warn).not.toHaveBeenCalled()
    })
  })
})
