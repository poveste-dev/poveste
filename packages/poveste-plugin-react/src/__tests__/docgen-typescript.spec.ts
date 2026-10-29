import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { typescriptProblem, typesProblem } from 'poveste/docgen'
import { describe, expect, it, onTestFinished } from 'vitest'
import { HstReact } from '../index'

// A book outside the workspace, whose own TypeScript would be found first if the plugin
// read the book's (#1401).
function book(typescript: string | undefined, packages: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'poveste-react-ts-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const [name, version] of Object.entries({ ...typescript ? { typescript } : {}, ...packages })) {
    mkdirSync(join(root, 'node_modules', name), { recursive: true })
    writeFileSync(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, version }))
  }
  return root
}

const from = HstReact().docgen!.typescript!
const types = HstReact().docgen!.types!

describe('react auto-docs in a book', () => {
  // Its own TypeScript 6 reads the book, whatever the book has, so neither turns it off (#1464).
  it.each([['7.0.2'], ['6.0.3'], [undefined]])('stays on in a book whose TypeScript is %s', (version) => {
    expect(typescriptProblem(book(version), from)).toBeUndefined()
  })

  // Without them every component reads as `any`: 189 of a library's 236 did (#1161).
  it('turns off without `@types/react`, naming it', () => {
    expect(typesProblem(book('6.0.3'), types)).toMatch(/from `@types\/react`, which this book does not have/)
  })

  it('stays on with `@types/react`', () => {
    expect(typesProblem(book('6.0.3', { '@types/react': '19.3.0' }), types)).toBeUndefined()
  })
})
