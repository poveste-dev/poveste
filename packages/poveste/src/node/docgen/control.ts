import type { DocControl } from '@poveste/shared'
import type ts from 'typescript'

// TypeScript 6's own `lib` files don't set `hasNoDefaultLib`, so they are known by path.
const LIB_FILE = /[\\/]typescript[\\/]lib[\\/]lib\.[^\\/]+\.d\.ts$/

/**
 * The control a prop's type picks, read off the checker's type rather than the printed
 * one: the table's string is cut and leaves aliases from packages closed, which would
 * lose about half the selects a component library declares (#160).
 */
export function controlFor(typescript: typeof ts, checker: ts.TypeChecker, type: ts.Type): DocControl | undefined {
  const { TypeFlags } = typescript
  // Before narrowing: `NonNullable<unknown>` is `{}`, which would read as an object.
  if (type.flags & (TypeFlags.Any | TypeFlags.Unknown)) {
    return undefined
  }
  const present = checker.getNonNullableType(type)
  if (present.flags & (TypeFlags.Boolean | TypeFlags.BooleanLiteral)) {
    return { kind: 'boolean' }
  }
  if (present.flags & (TypeFlags.String | TypeFlags.TemplateLiteral)) {
    return { kind: 'text' }
  }
  if (present.flags & TypeFlags.Number) {
    return { kind: 'number' }
  }
  const members = present.isUnion() ? present.types : [present]
  if (members.every(member => member.isStringLiteral() || member.isNumberLiteral())) {
    return { kind: 'select', options: members.map(member => (member as ts.StringLiteralType | ts.NumberLiteralType).value) }
  }
  if (isPlainData(typescript, checker, present)) {
    return { kind: 'json' }
  }
  return undefined
}

// An array, a tuple or an object type the code declares: not a function, and not a
// built-in such as `Date` or `HTMLElement`, which JSON can't carry.
function isPlainData(typescript: typeof ts, checker: ts.TypeChecker, type: ts.Type): boolean {
  if (!(type.flags & typescript.TypeFlags.Object) || type.getCallSignatures().length || type.getConstructSignatures().length) {
    return false
  }
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return true
  }
  return !(type.getSymbol()?.getDeclarations() ?? []).some(declaration => LIB_FILE.test(declaration.getSourceFile().fileName))
}
