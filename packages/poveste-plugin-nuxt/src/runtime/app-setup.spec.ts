import { afterEach, describe, expect, it, vi } from 'vitest'

// Collection evaluates this module and Nuxt's again for every pass, but `unctx`,
// which holds Nuxt's current app, is external and keeps the previous pass's app.
// Setting the new one then threw "Context conflict" in every worker (#1283).
describe('setupNuxtApp during collection', () => {
  const unset = vi.fn()

  function stubNuxt() {
    vi.stubGlobal('__HST_COLLECT__', true)
    vi.stubGlobal('window', {
      document: { createElement: () => ({}), body: { appendChild: () => {} } },
      fetch,
      Headers,
    })
    vi.doMock('#app/nuxt', () => ({ getNuxtAppCtx: () => ({ unset }) }))
    vi.doMock('#app/entry', () => ({ default: async () => {} }))
  }

  afterEach(() => {
    unset.mockClear()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('clears the app the previous pass left current, once in a pass', async () => {
    stubNuxt()
    const { setupNuxtApp } = await import('./app-setup')

    await setupNuxtApp({})
    await setupNuxtApp({})

    expect(unset).toHaveBeenCalledTimes(1)
  })

  it('clears it again in the next pass, which evaluates this module again', async () => {
    stubNuxt()
    await (await import('./app-setup')).setupNuxtApp({})
    vi.resetModules()

    await (await import('./app-setup')).setupNuxtApp({})

    expect(unset).toHaveBeenCalledTimes(2)
  })
})
