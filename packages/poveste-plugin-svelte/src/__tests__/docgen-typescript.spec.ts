import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { typescriptProblem } from 'poveste/docgen'
import { describe, expect, it, onTestFinished } from 'vitest'
import { HstSvelte } from '../index.node'

// A book outside the workspace, whose own TypeScript is found before anything the
// workspace or `NODE_PATH` adds (#1401).
function book(typescript: string) {
  const root = mkdtempSync(join(tmpdir(), 'poveste-svelte-ts-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'node_modules', 'typescript'), { recursive: true })
  writeFileSync(join(root, 'node_modules', 'typescript', 'package.json'), JSON.stringify({ name: 'typescript', version: typescript }))
  return root
}

const from = HstSvelte().docgen!.typescript!

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
