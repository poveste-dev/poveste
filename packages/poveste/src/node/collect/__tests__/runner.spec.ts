import type { EvaluatedModuleNode } from 'vite/module-runner'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { filenameOf } from '../runner.ts'

/** Only the two fields `filenameOf` reads. */
function node(id: string, file?: string): Readonly<EvaluatedModuleNode> {
  return { id, file } as unknown as EvaluatedModuleNode
}

const cwd = process.cwd()
afterEach(() => process.chdir(cwd))

describe('the file a CJS module is told it is', () => {
  it('takes a path that exists', () => {
    const real = join(realpathSync(mkdtempSync(join(tmpdir(), 'poveste-runner-'))), 'index.js')
    writeFileSync(real, '')

    expect(filenameOf(node(real, real))).toBe(real)
  })

  /*
   * The defect. A Vite id is root-relative, so `/node_modules/vue/index.js` is an
   * id and not a path — and `isAbsolute` says true of it, which is what the old
   * predicate asked. The module then got that as its `__filename`, and its own
   * `require('./dist/vue.cjs.prod.js')` resolved under the filesystem root (#1048).
   */
  it('re-roots an id that only looks absolute', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-runner-')))
    mkdirSync(join(root, 'node_modules', 'vue'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'vue', 'index.js'), '')
    process.chdir(root)

    const id = '/node_modules/vue/index.js'

    expect(filenameOf(node(id, id))).toBe(join(root, id))
  })

  // Vite hands the same root-relative string as `file`, so trusting `file`
  // because it is set is what made the first attempt at this fix no fix at all.
  it('does not trust `file` merely for being set', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-runner-')))
    process.chdir(root)

    expect(filenameOf(node('/node_modules/gone/index.js', '/node_modules/gone/index.js')))
      .toBe(join(root, 'virtual-module'))
  })

  it('falls back for a module with no file on disk at all', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-runner-')))
    process.chdir(root)

    expect(filenameOf(node('\0virtual:poveste-stories'))).toBe(join(root, 'virtual-module'))
  })

  it('prefers `file` over `id` when both name something', () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-runner-')))
    const file = join(dir, 'real.js')
    const other = join(dir, 'other.js')
    writeFileSync(file, '')
    writeFileSync(other, '')

    expect(filenameOf(node(other, file))).toBe(file)
  })

  it('drops a query or hash before looking', () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-runner-')))
    const file = join(dir, 'dep.js')
    writeFileSync(file, '')

    expect(filenameOf(node(`${file}?v=1`, `${file}?v=1`))).toBe(file)
  })
})
