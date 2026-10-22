import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { typescriptProblem, typescriptProblemIn } from '../docgen/typescript.js'

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

describe('the TypeScript auto-docs reads component types with', () => {
  it('turns auto-docs off in a book that has none, naming the version to install', () => {
    expect(typescriptProblemIn(searchFrom(book()))).toMatch(/does not have\. Install `typescript@6`/)
  })

  it('turns auto-docs off in a book on TypeScript 7, which no extractor can read', () => {
    expect(typescriptProblemIn(searchFrom(book('7.0.2')))).toMatch(/has TypeScript 7\.0\.2\. Install `typescript@6`/)
  })

  it('leaves auto-docs on with TypeScript 6', () => {
    expect(typescriptProblemIn(searchFrom(book('6.0.3')))).toBeUndefined()
  })
})

// Each book has a TypeScript of its own, found before anything `NODE_PATH` adds.
describe('where an extractor loads TypeScript from', () => {
  it('is the book\'s root for `book`', () => {
    expect(typescriptProblem(book('7.0.2'), 'book')).toMatch(/has TypeScript 7\.0\.2/)
  })

  it('is the file a plugin names, as Vue names `vue-component-meta` with its own TypeScript', () => {
    const root = book('7.0.2')
    const meta = join(root, 'node_modules', 'vue-component-meta')
    mkdirSync(join(meta, 'node_modules', 'typescript'), { recursive: true })
    writeFileSync(join(meta, 'node_modules', 'typescript', 'package.json'), JSON.stringify({ name: 'typescript', version: '6.0.3' }))
    writeFileSync(join(meta, 'index.js'), '')

    expect(typescriptProblem(root, join(meta, 'index.js'))).toBeUndefined()
  })
})
