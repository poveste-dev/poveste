import { describe, expect, it } from 'vitest'
import { QUASAR_APP_VITE_REQUIRED, quasarViteConfig, resolveTestingConfig } from './index.ts'

describe('resolveTestingConfig', () => {
  it('returns the entrypoint when it is there', async () => {
    const getTestingConfig = async () => ({})

    await expect(resolveTestingConfig(async () => ({ getTestingConfig }))).resolves.toBe(getTestingConfig)
  })

  it('names the missing package when it cannot be imported', async () => {
    // The unhelpful version of this is a bare MODULE_NOT_FOUND for a subpath.
    await expect(resolveTestingConfig(async () => {
      throw new Error('Cannot find package')
    })).rejects.toThrow(QUASAR_APP_VITE_REQUIRED)
  })

  it('names it again when the entrypoint exists but has moved', async () => {
    // `getTestingConfig` is documented as being for @quasar/testing, so it can be
    // renamed without it being a breaking change for anyone Quasar counts.
    await expect(resolveTestingConfig(async () => ({}))).rejects.toThrow(QUASAR_APP_VITE_REQUIRED)
  })
})

describe('quasarViteConfig', () => {
  const extracted = {
    define: { __QUASAR_SSR__: false },
    resolve: { alias: { '@': '/src' }, extensions: ['.vue'], dedupe: ['vue'] },
    plugins: [{ name: 'vite:vue' }, { name: 'vite:quasar:script' }],
  }

  it('keeps quasar transformed rather than externalised', () => {
    // Without this, collection loads Quasar's source through Node and
    // `__QUASAR_VERSION__` — written by Quasar's plugin at transform time — is
    // never defined.
    expect(quasarViteConfig(extracted).ssr).toEqual({ noExternal: [/quasar/] })
  })

  it('passes every plugin through, including Quasar\'s own Vue one', () => {
    // @quasar/vite-plugin asserts a Vue plugin is registered before it, so
    // dropping `vite:vue` as a duplicate fails config resolution outright.
    expect(quasarViteConfig(extracted).plugins).toBe(extracted.plugins)
  })

  it('carries the define and resolve the framework computed', () => {
    const config = quasarViteConfig(extracted)

    expect(config.define).toEqual({ __QUASAR_SSR__: false })
    expect(config.resolve).toEqual({ alias: { '@': '/src' }, extensions: ['.vue'], dedupe: ['vue'] })
  })

  it('survives a config that declares none of them', () => {
    expect(quasarViteConfig({})).toEqual({
      ssr: { noExternal: [/quasar/] },
      define: {},
      resolve: { alias: undefined, extensions: undefined, dedupe: undefined },
      plugins: undefined,
    })
  })
})
