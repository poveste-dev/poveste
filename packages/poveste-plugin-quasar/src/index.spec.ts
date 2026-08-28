import { describe, expect, it } from 'vitest'
import { findQuasarProject, isPackageAbsent, QUASAR_APP_VITE_REQUIRED, QUASAR_EXITED, quasarViteConfig, resolveTestingConfig, withoutProcessExit } from './index.ts'

describe('resolveTestingConfig', () => {
  it('returns the entrypoint when it is there', async () => {
    const getTestingConfig = async () => ({})

    await expect(resolveTestingConfig(async () => ({ getTestingConfig }))).resolves.toBe(getTestingConfig)
  })

  it('names the missing package when it cannot be imported', async () => {
    // The unhelpful version of this is a bare MODULE_NOT_FOUND for a subpath.
    await expect(resolveTestingConfig(async () => {
      throw Object.assign(new Error('Cannot find package'), { code: 'ERR_MODULE_NOT_FOUND' })
    })).rejects.toThrow(QUASAR_APP_VITE_REQUIRED)
  })

  it('does not relabel a failure that is not a missing package', async () => {
    // A broken transitive dependency reported as "reinstall @quasar/app-vite"
    // sends the reader after something that was never wrong, and loses this.
    const broken = new Error('Cannot find module \'some-transitive-dep\'')

    await expect(resolveTestingConfig(async () => {
      throw broken
    })).rejects.toThrow(broken)
  })

  it('keeps the original error as the cause when the package really is absent', async () => {
    const absent = Object.assign(new Error('not found'), { code: 'ERR_MODULE_NOT_FOUND' })

    await expect(resolveTestingConfig(async () => {
      throw absent
    })).rejects.toMatchObject({ cause: absent })
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

describe('isPackageAbsent', () => {
  it('claims the two codes that mean the package or its entrypoint is not there', () => {
    expect(['ERR_MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED']
      .map(code => isPackageAbsent(Object.assign(new Error('x'), { code })))).toEqual([true, true])
  })

  it('leaves every other failure alone', () => {
    expect([new Error('boom'), Object.assign(new Error('x'), { code: 'ERR_INVALID_ARG_TYPE' }), undefined]
      .map(isPackageAbsent)).toEqual([false, false, false])
  })
})

describe('findQuasarProject', () => {
  const exists = (path: string) => path === '/app/quasar.config.js'

  it('finds the project a story lives inside', () => {
    expect(findQuasarProject('/app/src/components', exists)).toBe('/app')
  })

  it('has nothing when there is no Quasar project above', () => {
    // Better than letting Quasar resolve nothing and exit the process over it.
    expect(findQuasarProject('/somewhere/else', exists)).toBeUndefined()
  })
})

describe('withoutProcessExit', () => {
  it('turns an exit into an error that names the plugin', async () => {
    // Quasar reports a bad project by calling `fatal()`, which is `process.exit(1)`.
    await expect(withoutProcessExit(async () => {
      process.exit(1)
    })).rejects.toThrow(QUASAR_EXITED)
  })

  it('puts the real process.exit back afterwards', async () => {
    const before = process.exit

    await withoutProcessExit(async () => 'ok')

    expect(process.exit).toBe(before)
  })

  it('puts it back even when the call throws', async () => {
    const before = process.exit

    await expect(withoutProcessExit(async () => {
      throw new Error('boom')
    })).rejects.toThrow('boom')
    expect(process.exit).toBe(before)
  })
})
