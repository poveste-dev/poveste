import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SVELTE_RETIRED_SETUP_HOOK_NAMES, SVELTE_SETUP_HOOK_NAMES } from '../setup-hooks.js'
import { callSetupFunctions } from './svelte.js'

const api = {} as any

function calls() {
  return { generated: [] as string[], user: [] as string[] }
}

describe('callSetupFunctions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('runs the hook a setup file exports', async () => {
    const seen = calls()

    await callSetupFunctions({}, { setupSvelte5: () => void seen.user.push('setupSvelte5') }, api)

    expect(seen.user).toEqual(['setupSvelte5'])
  })

  it('accepts the unnumbered name on its own', async () => {
    const seen = calls()

    await callSetupFunctions({}, { setupSvelte: () => void seen.user.push('setupSvelte') }, api)

    expect(seen.user).toEqual(['setupSvelte'])
  })

  // The failure this conversion exists to prevent. The loop it replaced ran
  // every name present, so a file part-way through the migration had its setup
  // applied twice with nothing said (#157).
  it('runs one hook, not both, when a file is part-way through the migration', async () => {
    const seen = calls()

    await callSetupFunctions({}, {
      setupSvelte5: () => void seen.user.push('setupSvelte5'),
      setupSvelte: () => void seen.user.push('setupSvelte'),
    }, api)

    expect(seen.user).toEqual(['setupSvelte5'])
  })

  it('names both hooks in the warning, so the one that was skipped is not a guess', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await callSetupFunctions({}, { setupSvelte5: () => {}, setupSvelte: () => {} }, api)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('setupSvelte5, setupSvelte'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Only setupSvelte5 runs'))
  })

  it('says nothing when a file exports one name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await callSetupFunctions({}, { setupSvelte: () => {} }, api)

    expect(warn).not.toHaveBeenCalled()
  })

  // Established-first: an existing file keeps the behaviour it has, and the new
  // name is the one that yields.
  it('prefers the established name over the new one', async () => {
    const seen = calls()
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await callSetupFunctions({}, {
      setupSvelte: () => void seen.user.push('setupSvelte'),
      setupSvelte3: () => void seen.user.push('setupSvelte3'),
    }, api)

    expect(seen.user).toEqual(['setupSvelte3'])
  })

  it('runs the generated hook before the story file`s own', async () => {
    const order: string[] = []

    await callSetupFunctions(
      { setupSvelte5: () => void order.push('generated') },
      { setupSvelte: () => void order.push('user') },
      api,
    )

    expect(order).toEqual(['generated', 'user'])
  })

  it('runs a variant`s own handler last', async () => {
    const order: string[] = []

    await callSetupFunctions(
      {},
      { setupSvelte5: () => void order.push('setup') },
      api,
      () => void order.push('variant'),
    )

    expect(order).toEqual(['setup', 'variant'])
  })

  // Not decoration: a name added here has to be removed from the list above in
  // the same change, and that is a 1.0 decision rather than a tidy-up.
  it('retires no name yet, so every accepted spelling is still read', () => {
    expect(SVELTE_RETIRED_SETUP_HOOK_NAMES).toEqual([])
  })

  it('lists the names most established first, which is what makes the choice deterministic', () => {
    expect(SVELTE_SETUP_HOOK_NAMES).toEqual(['setupSvelte3', 'setupSvelte4', 'setupSvelte5', 'setupSvelte'])
  })
})
