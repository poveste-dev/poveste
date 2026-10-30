import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { typescriptProblem } from 'poveste/docgen'
import { describe, expect, it, onTestFinished } from 'vitest'
import { HstSolid } from '../index'

// A book outside the workspace, whose own TypeScript would be found first if the plugin
// read the book's (#1401).
function book(typescript: string | undefined) {
  const root = mkdtempSync(join(tmpdir(), 'poveste-solid-ts-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  if (typescript) {
    mkdirSync(join(root, 'node_modules', 'typescript'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'typescript', 'package.json'), JSON.stringify({ name: 'typescript', version: typescript }))
  }
  return root
}

const from = HstSolid().docgen!.typescript!

describe('solid auto-docs in a book', () => {
  // Poveste's TypeScript 6 reads the book, whatever the book has, so neither turns it off (#1464).
  it.each([['7.0.2'], ['6.0.3'], [undefined]])('stays on in a book whose TypeScript is %s', (version) => {
    expect(typescriptProblem(book(version), from)).toBeUndefined()
  })
})
