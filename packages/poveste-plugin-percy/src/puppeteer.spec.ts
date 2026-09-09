import { describe, expect, it } from 'vitest'
import { loadPuppeteer } from './puppeteer.js'

function resolutionFailure() {
  return Object.assign(
    new Error('Cannot find package \'puppeteer\' imported from @poveste/plugin-percy'),
    { code: 'ERR_MODULE_NOT_FOUND' },
  )
}

function failingWith(error: unknown) {
  return async () => {
    throw error
  }
}

describe('loadPuppeteer', () => {
  it('passes the loaded module through when puppeteer is installed', async () => {
    const loaded = { puppeteer: {} as typeof import('puppeteer'), environmentInfo: 'puppeteer/24.9.0' }

    const result = await loadPuppeteer(async () => loaded)

    expect(result).toBe(loaded)
  })

  describe('when puppeteer cannot be loaded', () => {
    it('names the package, the command and the escape hatch', async () => {
      const failed = loadPuppeteer(failingWith(resolutionFailure()))

      await expect(failed).rejects.toThrow('@poveste/plugin-percy')
      await expect(failed).rejects.toThrow('npm i -D puppeteer')
      await expect(failed).rejects.toThrow('PERCY_TOKEN')
    })

    it('keeps the resolution error as the cause', async () => {
      const original = resolutionFailure()

      const failed = loadPuppeteer(failingWith(original))

      await expect(failed).rejects.toHaveProperty('cause', original)
    })

    it('gives the same message when the failure is not a resolution error', async () => {
      const original = new Error('libgbm.so.1: cannot open shared object file')

      const failed = loadPuppeteer(failingWith(original))

      await expect(failed).rejects.toThrow('npm i -D puppeteer')
      await expect(failed).rejects.toHaveProperty('cause', original)
    })
  })
})
