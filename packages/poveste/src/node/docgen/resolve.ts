import type ts from 'typescript'

/*
 * A named type in the table opened one level, so a reader sees that `ButtonSize` is
 * `"sm" | "md" | "lg"` without the source (#1527). One level only: the members of what
 * opens are printed by name, so a recursive type ends there, and the hover stays a
 * glance rather than a second table.
 */

/** Past this many members, a union or an object type is cut with `…`. */
const MAX_MEMBERS = 24
/** Past this length, the whole resolved form is cut with `…`. */
const MAX_LENGTH = 400

interface Reading {
  typescript: typeof ts
  checker: ts.TypeChecker
  print: (type: ts.Type) => string
  flags: ts.TypeFormatFlags
  location: ts.Node | undefined
  /** The table prints an optional prop without the `undefined` its type carries, and so does this. */
  dropUndefined: boolean
}

/**
 * The type opened one level, or `undefined` when nothing in it opens: an alias's
 * definition, an interface's or class's members, an enum's members, and in a union
 * each of those opened in place. A type declared only under `node_modules` stays
 * closed, so `ReactNode` or `HTMLAttributes` do not unfold into their libraries.
 */
export function resolveType(typescript: typeof ts, checker: ts.TypeChecker, type: ts.Type, printed: string, location?: ts.Node): string | undefined {
  const flags = typescript.TypeFormatFlags.NoTruncation | typescript.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
  const reading: Reading = {
    typescript,
    checker,
    print: member => checker.typeToString(member, location, flags),
    flags,
    location,
    dropUndefined: !/\bundefined\b/.test(printed),
  }
  const resolved = open(reading, type)
  if (resolved === undefined || squash(resolved) === squash(printed)) {
    return undefined
  }
  return resolved.length > MAX_LENGTH ? `${resolved.slice(0, MAX_LENGTH)}…` : resolved
}

function open(reading: Reading, type: ts.Type): string | undefined {
  const { typescript } = reading
  // An enum lists its members by name: a string enum's values are not assignable to it.
  // Checked first, since an enum's type carries the enum as its alias too.
  if (type.isUnion() && (type.getSymbol()?.flags ?? 0) & typescript.SymbolFlags.Enum) {
    return fromPackages(type.getSymbol()!) ? undefined : cut(type.types.map(reading.print), ' | ')
  }
  if (type.aliasSymbol && !fromPackages(type.aliasSymbol)) {
    return aliasDefinition(reading, type)
  }
  if (type.isUnion()) {
    // As written, `ButtonSize | null`, rather than flattened in the checker's own order.
    const written = (type as { origin?: ts.Type }).origin
    const members = (written?.isUnion() ? written.types : type.types)
      .filter(member => !(reading.dropUndefined && member.flags & typescript.TypeFlags.Undefined))
    let opened = false
    const parts = members.map((member) => {
      const inner = open(reading, member)
      // An enum's members, met one by one where `undefined` flattened the enum into the union.
      opened ||= inner !== undefined || (member.flags & typescript.TypeFlags.EnumLiteral) !== 0
      return inner ?? reading.print(member)
    })
    // `null` and `undefined` last, where a union written by hand puts them.
    const empty = (part: string) => part === 'null' || part === 'undefined'
    return opened ? cut([...parts.filter(part => !empty(part)), ...parts.filter(empty)], ' | ') : undefined
  }
  return openObject(reading, type)
}

/**
 * The alias's definition. A union is printed member by member from its declaration, in
 * the order it is written: the checker's own order is the order it met each type in.
 */
function aliasDefinition(reading: Reading, type: ts.Type): string {
  const { typescript, checker } = reading
  const node = type.aliasSymbol!.getDeclarations()?.find(typescript.isTypeAliasDeclaration)?.type
  if (node && typescript.isUnionTypeNode(node) && !type.aliasTypeArguments?.length) {
    return cut(node.types.map(member => reading.print(checker.getTypeFromTypeNode(member))), ' | ')
  }
  return reading.checker.typeToString(type, reading.location, reading.flags | reading.typescript.TypeFormatFlags.InTypeAlias)
}

/** An interface or class the book declares, as `{ name: type; … }`. */
function openObject({ typescript, checker, print }: Reading, type: ts.Type): string | undefined {
  const symbol = type.getSymbol()
  if (!symbol || !(symbol.flags & (typescript.SymbolFlags.Interface | typescript.SymbolFlags.Class)) || fromPackages(symbol)) {
    return undefined
  }
  if (type.getCallSignatures().length || checker.isArrayType(type)) {
    return undefined
  }
  const members = checker.getPropertiesOfType(type).map((property) => {
    const optional = property.flags & typescript.SymbolFlags.Optional ? '?' : ''
    const printed = print(checker.getTypeOfSymbol(property))
    return `${property.name}${optional}: ${optional ? printed.replace(/ \| undefined$/, '') : printed}`
  })
  return members.length ? `{ ${cut(members, '; ')} }` : '{}'
}

function cut(members: string[], separator: string): string {
  return members.length > MAX_MEMBERS
    ? `${members.slice(0, MAX_MEMBERS).join(separator)}${separator}…`
    : members.join(separator)
}

function fromPackages(symbol: ts.Symbol): boolean {
  const files = (symbol.getDeclarations() ?? []).map(declaration => declaration.getSourceFile().fileName.replaceAll('\\', '/'))
  return files.length > 0 && files.every(file => file.includes('/node_modules/'))
}

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
