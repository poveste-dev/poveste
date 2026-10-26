import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { typescriptProblem, typescriptProblemIn, typesProblem } from '../docgen/typescript.js'

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

// TypeScript finds a type package up the book's own `node_modules` chain, not on `NODE_PATH`.
describe('the type packages an extractor declares', () => {
  it('turn auto-docs off when the book lacks one, naming it', () => {
    expect(typesProblem(book(), ['@types/react'])).toMatch(/from `@types\/react`, which this book does not have\. Install `@types\/react`/)
  })

  it('leave auto-docs on when one is installed in a directory above the book', () => {
    const root = book()
    mkdirSync(join(root, 'node_modules', '@types', 'react'), { recursive: true })
    writeFileSync(join(root, 'node_modules', '@types', 'react', 'package.json'), JSON.stringify({ name: '@types/react', version: '19.3.0' }))
    const nested = join(root, 'apps', 'book')
    mkdirSync(nested, { recursive: true })

    expect(typesProblem(nested, ['@types/react'])).toBeUndefined()
  })
})

// Yarn PnP's runtime sets `process.versions.pnp` and answers resolution from its
// dependency map, with no `node_modules` anywhere; a hook doing both stands in for
// it. Every check read "does not have" in a PnP book that had TypeScript (#1508).
describe('the checks under Yarn PnP', () => {
  function underPnp(packages: Record<string, string>, expression: string): string {
    const root = mkdtempSync(join(tmpdir(), 'poveste-ts-pnp-'))
    books.push(root)
    const cache = join(root, 'cache')
    const map: Record<string, string> = {}
    for (const [name, version] of Object.entries(packages)) {
      mkdirSync(join(cache, name), { recursive: true })
      writeFileSync(join(cache, name, 'package.json'), JSON.stringify({ name, version }))
      map[`${name}/package.json`] = join(cache, name, 'package.json')
    }
    const hook = join(root, 'pnp.cjs')
    writeFileSync(hook, [
      `process.versions.pnp = '3'`,
      `const map = ${JSON.stringify(map)}`,
      `const Module = require('node:module')`,
      `const resolve = Module._resolveFilename`,
      `Module._resolveFilename = function (request, ...rest) {`,
      `  if (request in map) return map[request]`,
      `  if (/^(typescript|@types\\/react)\\//.test(request)) throw Object.assign(new Error('not in the map'), { code: 'MODULE_NOT_FOUND' })`,
      `  return resolve.call(this, request, ...rest)`,
      `}`,
    ].join('\n'))
    const module = pathToFileURL(join(import.meta.dirname, '..', 'docgen', 'typescript.ts')).href
    return execFileSync(process.execPath, [
      '--require',
      hook,
      '--input-type=module',
      '-e',
      `const { typescriptProblem, typesProblem } = await import(${JSON.stringify(module)}); const book = ${JSON.stringify(join(root, 'book'))}; console.log(${expression} ?? 'on')`,
    ], { encoding: 'utf8' }).trim()
  }

  it('find the TypeScript the book resolves, with no node_modules to search', () => {
    expect(underPnp({ typescript: '6.0.3' }, `typescriptProblem(book, 'book')`)).toBe('on')
  })

  it('still turn auto-docs off when the book resolves TypeScript 7', () => {
    expect(underPnp({ typescript: '7.0.2' }, `typescriptProblem(book, 'book')`)).toMatch(/has TypeScript 7\.0\.2/)
  })

  it('still turn auto-docs off when the book resolves no TypeScript', () => {
    expect(underPnp({}, `typescriptProblem(book, 'book')`)).toMatch(/which this book does not have/)
  })

  it('find a type package the book resolves, and name one it does not', () => {
    expect(underPnp({ '@types/react': '19.3.0' }, `typesProblem(book, ['@types/react'])`)).toBe('on')
    expect(underPnp({}, `typesProblem(book, ['@types/react'])`)).toMatch(/from `@types\/react`, which this book does not have/)
  })
})
