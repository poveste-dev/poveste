import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { resolveType } from '../docgen/resolve.js'

it('opens a class to what a reader can use of it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'poveste-resolve-'))
  const file = join(dir, 'account.ts')
  writeFileSync(file, `class Account {
  id = '';
  private token = '';
  protected role = '';
  #secret = '';
  [Symbol.iterator]() { return [][Symbol.iterator]() }
}
declare const value: Account
export { value }
`)
  try {
    const program = ts.createProgram([file], { strict: true, target: ts.ScriptTarget.ESNext, noEmit: true })
    const checker = program.getTypeChecker()
    const statement = program.getSourceFile(file)!.statements.find(ts.isVariableStatement)!
    const declaration = statement.declarationList.declarations[0]!

    expect(resolveType(ts, checker, checker.getTypeAtLocation(declaration), 'Account', declaration)).toBe('{ id: string }')
  }
  finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
