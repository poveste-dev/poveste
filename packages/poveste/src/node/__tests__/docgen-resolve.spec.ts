import { join } from 'pathe'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { resolveType } from '../docgen/resolve.js'

const fixture = join(import.meta.dirname, 'docgen-resolve/account.ts')

it('opens a class without its private, protected, `#` or symbol-keyed members', () => {
  const program = ts.createProgram([fixture], { strict: true, target: ts.ScriptTarget.ESNext, noEmit: true })
  const checker = program.getTypeChecker()
  const account = program.getSourceFile(fixture)!.statements.find(ts.isVariableStatement)!.declarationList.declarations[0]!

  const opened = resolveType(ts, checker, checker.getTypeAtLocation(account), 'Account', account)

  expect(opened).toBe('{ id: string }')
})
