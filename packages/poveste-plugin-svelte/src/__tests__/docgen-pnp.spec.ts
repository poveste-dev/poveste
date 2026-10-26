import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HstSvelte } from '../index.node'

// What the book resolves, standing in for Yarn PnP's dependency map: a PnP book has
// no `node_modules`, so only resolution can find `svelte2tsx` there (#1508).
const { resolvable } = vi.hoisted(() => ({ resolvable: { svelte2tsx: false } }))

vi.mock('node:module', async (original) => {
  const actual = await original<typeof import('node:module')>()
  return {
    ...actual,
    createRequire: (from: string) => {
      const require = actual.createRequire(from)
      const resolve = require.resolve
      return Object.assign(require, {
        resolve: (request: string, ...rest: []) => {
          if (request !== 'svelte2tsx/package.json') {
            return resolve(request, ...rest)
          }
          if (resolvable.svelte2tsx) {
            return join(from, '..', '.yarn', request)
          }
          throw Object.assign(new Error(`Cannot find module '${request}'`), { code: 'MODULE_NOT_FOUND' })
        },
      })
    },
  }
})

const unavailable = HstSvelte().docgen!.unavailable!
const books: string[] = []

function underPnp() {
  Object.defineProperty(process.versions, 'pnp', { value: '3', configurable: true, enumerable: true })
  const root = mkdtempSync(join(tmpdir(), 'poveste-svelte-pnp-'))
  books.push(root)
  return root
}

afterEach(() => {
  delete (process.versions as Record<string, string | undefined>)['pnp']
  resolvable.svelte2tsx = false
  books.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }))
})

describe('svelte auto-docs and `svelte2tsx` under Yarn PnP', () => {
  it('stays on when the book resolves it, with no node_modules to search', () => {
    const root = underPnp()
    resolvable.svelte2tsx = true

    expect(unavailable(root)).toBeUndefined()
  })

  it('turns off when the book resolves none, naming it', () => {
    expect(unavailable(underPnp())).toMatch(/through `svelte2tsx`, which this book does not have/)
  })
})
