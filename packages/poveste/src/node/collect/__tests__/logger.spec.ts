import type { Logger } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { collectionLogger } from '../logger.js'

function logger() {
  const base = { warn: vi.fn(), warnOnce: vi.fn(), info: vi.fn(), error: vi.fn(), clearScreen: vi.fn(), hasErrorLogged: vi.fn(), hasWarned: false } as unknown as Logger
  return { base, warn: base.warn, warnOnce: base.warnOnce, logger: collectionLogger(base) }
}

// Collection runs in Node, through an environment Vite treats as a browser's, so
// a package's Node build was reported 25 times over in a Nuxt book (#1203).
describe('the collection server\'s logger', () => {
  const NOISE = '(client) warning: Module "node:http" has been externalized for browser compatibility, imported by "/book/node_modules/ofetch/dist/node.mjs".'

  it('drops the browser-compatibility line, which is not true of Node', () => {
    const { logger: quiet, warn, warnOnce } = logger()

    quiet.warn(NOISE)
    quiet.warnOnce(NOISE)

    expect(warn).not.toHaveBeenCalled()
    expect(warnOnce).not.toHaveBeenCalled()
  })

  it('passes every other warning through, with its options', () => {
    const { logger: quiet, warn } = logger()

    quiet.warn('Sourcemap for "/a.js" points to missing source files', { timestamp: true })

    expect(warn).toHaveBeenCalledWith('Sourcemap for "/a.js" points to missing source files', { timestamp: true })
  })
})
