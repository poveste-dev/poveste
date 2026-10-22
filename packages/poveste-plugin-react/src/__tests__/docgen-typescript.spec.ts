import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { typescriptProblem, typesProblem } from 'poveste/docgen'
import { describe, expect, it, onTestFinished } from 'vitest'
import { HstReact } from '../index'

// A book outside the workspace, whose own TypeScript is found before anything the
// workspace or `NODE_PATH` adds (#1401).
function book(typescript: string, packages: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'poveste-react-ts-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  for (const [name, version] of Object.entries({ typescript, ...packages })) {
    mkdirSync(join(root, 'node_modules', name), { recursive: true })
    writeFileSync(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, version }))
  }
  return root
}

const from = HstReact().docgen!.typescript!
const types = HstReact().docgen!.types!

describe('react auto-docs in a book', () => {
  it('reads types with the book\'s own TypeScript', () => {
    expect(from).toBe('book')
  })

  it('turns off on TypeScript 7, naming the version to install', () => {
    expect(typescriptProblem(book('7.0.2'), from)).toMatch(/has TypeScript 7\.0\.2\. Install `typescript@6`/)
  })

  it('stays on with TypeScript 6', () => {
    expect(typescriptProblem(book('6.0.3'), from)).toBeUndefined()
  })

  // Without them every component reads as `any`: 189 of a library's 236 did (#1161).
  it('turns off without `@types/react`, naming it', () => {
    expect(typesProblem(book('6.0.3'), types)).toMatch(/from `@types\/react`, which this book does not have/)
  })

  it('stays on with `@types/react`', () => {
    expect(typesProblem(book('6.0.3', { '@types/react': '19.3.0' }), types)).toBeUndefined()
  })
})
