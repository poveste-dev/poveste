import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { tree } from './fixture-tree.ts'

describe('tree', () => {
  it('writes each file at its path under the root it returns', () => {
    const root = tree({ 'docs/guide/index.md': '# Guide\n' })

    expect(readFileSync(join(root, 'docs/guide/index.md'), 'utf8')).toBe('# Guide\n')
  })

  it('creates an empty directory for a key ending in a slash', () => {
    const root = tree({ 'examples/': '' })

    expect(readdirSync(join(root, 'examples'))).toEqual([])
  })

  it('gives each call its own root', () => {
    expect(tree({ 'README.md': '# one\n' })).not.toBe(tree({ 'README.md': '# two\n' }))
  })

  // A tree left behind fails nothing: with the cleanup deleted, every spec still
  // passed and 81 directories stayed in the temp dir. Registered before `tree()`,
  // this runs after the tree's own cleanup, because finished hooks run
  // last-registered first.
  it('removes the tree once the test that made it has finished', () => {
    let root = ''
    onTestFinished(() => {
      expect(existsSync(root), `${root} is still on disk`).toBe(false)
    })

    root = tree({ 'README.md': '# fixture\n' })

    expect(existsSync(root)).toBe(true)
  })
})
