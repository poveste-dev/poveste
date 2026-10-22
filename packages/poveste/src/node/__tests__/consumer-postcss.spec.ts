import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { postcssOffChrome } from '../style-isolation/consumer-postcss.js'

const CHROME = '/book/node_modules/@poveste/app/dist'
const chromeFile = { opts: { from: `${CHROME}/style.css?used` } }
const bookFile = { opts: { from: '/book/src/main.css' } }

interface Wrapped { postcssPlugin: string, prepare?: (result: object) => Record<string, unknown>, Once?: (root: object, helpers: object) => unknown }

async function wrap(plugins: unknown[]): Promise<Wrapped[]> {
  return (await postcssOffChrome('/book', { plugins }, CHROME))!.plugins as Wrapped[]
}

describe('the book\'s PostCSS plugins, kept off the chrome\'s stylesheets', () => {
  it('gives a plugin\'s listeners for the book\'s own file and none for the chrome\'s', async () => {
    const AtRule = vi.fn()
    const [plugin] = await wrap([{ postcssPlugin: 'book-plugin', AtRule }])

    expect(plugin!.postcssPlugin).toBe('book-plugin')
    expect(plugin!.prepare!(bookFile)).toEqual({ AtRule })
    expect(plugin!.prepare!(chromeFile)).toEqual({})
  })

  it('calls a plugin\'s own `prepare` only for the book\'s file', async () => {
    const prepare = vi.fn(() => ({ Once: vi.fn() }))
    const [plugin] = await wrap([{ postcssPlugin: 'prepared', prepare }])

    plugin!.prepare!(chromeFile)
    plugin!.prepare!(bookFile)

    expect(prepare).toHaveBeenCalledExactlyOnceWith(bookFile)
  })

  // Tailwind 3's shape: a pack of legacy function plugins (#1433).
  it('unpacks a pack and runs its legacy functions only on the book\'s file', async () => {
    const legacy = vi.fn()
    const plugins = await wrap([{ postcssPlugin: 'tailwindcss', plugins: [legacy, legacy] }])
    const root = {}

    expect(plugins).toHaveLength(2)
    plugins.forEach(plugin => plugin.Once!(root, { result: chromeFile }))
    expect(legacy).not.toHaveBeenCalled()
    plugins.forEach(plugin => plugin.Once!(root, { result: bookFile }))
    expect(legacy).toHaveBeenCalledTimes(2)
  })

  it('creates a plugin given as its creator', async () => {
    const creator = Object.assign(() => ({ postcssPlugin: 'created', Rule: vi.fn() }), { postcss: true })

    const [plugin] = await wrap([creator])

    expect(plugin!.postcssPlugin).toBe('created')
  })
})

describe('the book\'s PostCSS config', () => {
  function book(config?: string) {
    const root = mkdtempSync(join(tmpdir(), 'poveste-postcss-'))
    onTestFinished(() => rmSync(root, { recursive: true, force: true }))
    if (config) {
      writeFileSync(join(root, 'postcss.config.cjs'), config)
    }
    return root
  }

  it('is read from the book, with its options', async () => {
    const root = book('module.exports = { map: false, plugins: [{ postcssPlugin: \'from-file\' }] }')

    const config = await postcssOffChrome(root, undefined, CHROME)

    expect(config).toMatchObject({ map: false, plugins: [{ postcssPlugin: 'from-file' }] })
  })

  it('is nothing for a book without one, so Vite looks for none', async () => {
    expect(await postcssOffChrome(book(), undefined, CHROME)).toBeUndefined()
  })
})
