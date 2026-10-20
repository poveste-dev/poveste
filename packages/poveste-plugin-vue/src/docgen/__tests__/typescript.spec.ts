import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { typescriptProblemIn } from '../typescript.js'

// A book outside the workspace, searched up its own `node_modules` chain only: the
// workspace hoists TypeScript, and `pnpm exec` sets `NODE_PATH`, so a book inside
// it, or Node's own search with global paths, always finds one (#1382).
const books: string[] = []

function book(typescript?: string) {
  const root = mkdtempSync(join(tmpdir(), 'poveste-ts-book-'))
  books.push(root)
  mkdirSync(join(root, 'node_modules'))
  if (typescript) {
    mkdirSync(join(root, 'node_modules', 'typescript'))
    writeFileSync(join(root, 'node_modules', 'typescript', 'package.json'), JSON.stringify({ name: 'typescript', version: typescript }))
  }
  return root
}

function searchFrom(root: string) {
  const dirs: string[] = []
  for (let dir = root; dir !== dirname(dir); dir = dirname(dir)) {
    dirs.push(join(dir, 'node_modules'))
  }
  return dirs
}

afterEach(() => {
  books.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }))
})

describe('the TypeScript auto-docs reads Vue types with', () => {
  it('turns auto-docs off in a book that has none, naming the version to install', () => {
    expect(typescriptProblemIn(searchFrom(book()))).toMatch(/does not have\. Install `typescript@6`/)
  })

  it('turns auto-docs off in a book on TypeScript 7, which vue-component-meta cannot read', () => {
    expect(typescriptProblemIn(searchFrom(book('7.0.2')))).toMatch(/has TypeScript 7\.0\.2\. Install `typescript@6`/)
  })

  it('leaves auto-docs on with TypeScript 6', () => {
    expect(typescriptProblemIn(searchFrom(book('6.0.3')))).toBeUndefined()
  })
})
