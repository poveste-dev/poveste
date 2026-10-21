import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { typescriptProblem } from 'poveste/docgen'
import { describe, expect, it, onTestFinished } from 'vitest'
import { HstSvelte } from '../index.node'

// A book outside the workspace, whose own TypeScript is found before anything the
// workspace or `NODE_PATH` adds (#1401).
function book(typescript: string, packages: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'poveste-svelte-ts-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const [name, version] of Object.entries({ typescript, ...packages })) {
    mkdirSync(join(root, 'node_modules', name), { recursive: true })
    writeFileSync(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, version }))
  }
  return root
}

const from = HstSvelte().docgen!.typescript!
const unavailable = HstSvelte().docgen!.unavailable!

describe('svelte auto-docs in a book', () => {
  it('reads types with the book\'s own TypeScript', () => {
    expect(from).toBe('book')
  })

  it('turns off on TypeScript 7, naming the version to install', () => {
    expect(typescriptProblem(book('7.0.2'), from)).toMatch(/has TypeScript 7\.0\.2\. Install `typescript@6`/)
  })

  it('stays on with TypeScript 6', () => {
    expect(typescriptProblem(book('6.0.3'), from)).toBeUndefined()
  })
})

// An optional peer, so a book with auto-docs off installs neither it nor the TypeScript it peers on.
describe('svelte auto-docs and `svelte2tsx`', () => {
  it('turns off in a book without it, naming it', () => {
    expect(unavailable(book('6.0.3'))).toMatch(/through `svelte2tsx`, which this book does not have\. Install `svelte2tsx`/)
  })

  it('stays on in a book with it', () => {
    expect(unavailable(book('6.0.3', { svelte2tsx: '0.7.61' }))).toBeUndefined()
  })

  // The service asks about TypeScript first, so this book's one line names TypeScript 7.
  it('leaves a book on TypeScript 7 to the TypeScript check', () => {
    const root = book('7.0.2', { svelte2tsx: '0.7.61' })

    expect(typescriptProblem(root, from)).toMatch(/has TypeScript 7\.0\.2/)
    expect(unavailable(root)).toBeUndefined()
  })
})
