// Reads a component's declared props out of its source, because a compiled
// Svelte component keeps no record of what it accepts the way a Vue vnode does
// (#233).

import type { PropDefinition } from '@poveste/shared'
import { parse } from 'svelte/compiler'

type Node = any

const STYLE_BLOCK = /<style[\s\S]*?<\/style>/gi
const TYPE_IMPORT = /\bimport\s+type\b(?:(?!\bfrom\b)[\s\S])+?\bfrom\s*['"][^'"]+['"]\s*;?/g

// Svelte's parser reads raw source, so two shapes that compile fine in the real
// pipeline throw here: a preprocessed `<style lang="scss">`, and `import type
// { Hst }` beside `export let Hst: Hst`, which reads as a duplicate declaration.
// Neither is needed to find props.
export function parseable(source: string): string {
  return source.replace(STYLE_BLOCK, '').replace(TYPE_IMPORT, '')
}

// Poveste injects `Hst` into every story file. It is the plugin's own API
// object, not something a user sets, and every `.story.svelte` declares it.
const INJECTED = new Set(['Hst'])

function nameOf(typeName: Node | undefined): string | undefined {
  return typeName?.name ?? typeName?.right?.name
}

// A snippet is slot content and a function is called by the component. No
// control can author either, and handing one to HstJson replaces it with a
// plain object the component then renders or invokes.
export function isUndrivable(node: Node | undefined): boolean {
  if (!node) {
    return false
  }
  if (node.type === 'TSUnionType') {
    return node.types.some((member: Node) => isUndrivable(member))
  }
  if (node.type === 'TSParenthesizedType') {
    return isUndrivable(node.typeAnnotation)
  }
  return node.type === 'TSFunctionType' || nameOf(node.typeName) === 'Snippet'
}

export function acceptsUndefined(node: Node | undefined): boolean {
  return node?.type === 'TSUnionType'
    && node.types.some((m: Node) => m.type === 'TSUndefinedKeyword' || m.type === 'TSNullKeyword')
}

export function typesFromAnnotation(node: Node | undefined): string[] | undefined {
  if (!node) {
    return undefined
  }

  switch (node.type) {
    case 'TSStringKeyword': return ['string']
    case 'TSNumberKeyword': return ['number']
    case 'TSBooleanKeyword': return ['boolean']
    case 'TSArrayType':
    case 'TSTupleType': return ['array']
    case 'TSTypeOperator':
    case 'TSParenthesizedType': return typesFromAnnotation(node.typeAnnotation)
    case 'TSTypeLiteral': return ['object']
    case 'TSLiteralType': return typesFromLiteral(node.literal)
    case 'TSUnionType': return unionTypes(node)
    case 'TSTypeReference':
      return ['Array', 'ReadonlyArray'].includes(nameOf(node.typeName) ?? '') ? ['array'] : ['unknown']
    default: return ['unknown']
  }
}

function typesFromLiteral(literal: Node): string[] {
  // A negative literal type is a UnaryExpression wrapping the number.
  const value = literal?.type === 'UnaryExpression' ? literal.argument?.value : literal?.value
  return [typeName(value)]
}

function typeName(value: unknown): string {
  switch (typeof value) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    default: return 'unknown'
  }
}

// Nullish members describe absence, not a control. `unknown` sorts last because
// the panel reads `types[0]`, so a concrete type has to win however it was typed.
function unionTypes(node: Node): string[] {
  const members: string[] = node.types
    .filter((m: Node) => m.type !== 'TSUndefinedKeyword' && m.type !== 'TSNullKeyword')
    .flatMap((m: Node): string[] => typesFromAnnotation(m) ?? [])

  return [...new Set(members)].sort((a, b) => Number(a === 'unknown') - Number(b === 'unknown'))
}

// `export let x = 1` is a prop; `export const` and `export function` are
// read-only accessors, and `export { a as b }` renames one.
function legacyProps(body: Node[]): PropDefinition[] {
  const props: PropDefinition[] = []

  for (const node of body) {
    if (node.type !== 'ExportNamedDeclaration') {
      continue
    }

    if (!node.declaration && node.specifiers?.length) {
      for (const specifier of node.specifiers) {
        props.push({ name: specifier.exported?.name ?? specifier.local?.name, required: false })
      }
      continue
    }

    if (node.declaration?.type !== 'VariableDeclaration' || node.declaration.kind !== 'let') {
      continue
    }

    for (const declarator of node.declaration.declarations) {
      if (declarator.id.type !== 'Identifier') {
        continue
      }
      const annotation = declarator.id.typeAnnotation?.typeAnnotation
      if (isUndrivable(annotation) || INJECTED.has(declarator.id.name)) {
        continue
      }
      const value = literalValue(declarator.init)
      props.push({
        name: declarator.id.name,
        types: typesFromAnnotation(annotation) ?? typesFromValue(value),
        required: !declarator.init && !acceptsUndefined(annotation),
        default: value,
      })
    }
  }

  return props
}

// Without an annotation the initialiser is the only evidence of a type, and it
// is enough to pick a control for a plain-JS component.
function typesFromValue(value: unknown): string[] | undefined {
  if (value == null) {
    return undefined
  }
  const name = typeName(value)
  return name === 'unknown' ? undefined : [name]
}

function runesProps(body: Node[], declared: Map<string, Node[]>): PropDefinition[] {
  const declarator = body
    .filter((node: Node) => node.type === 'VariableDeclaration')
    .flatMap((node: Node) => node.declarations)
    .find((d: Node) => d.init?.type === 'CallExpression' && d.init.callee?.name === '$props')

  return declarator ? fromDeclarator(declarator, declared) : []
}

function declaredTypes(body: Node[]): Map<string, Node[]> {
  const found = new Map<string, Node[]>()

  for (const node of body) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node
    if (declaration?.type === 'TSInterfaceDeclaration') {
      found.set(declaration.id.name, declaration.body.body)
    }
    if (declaration?.type === 'TSTypeAliasDeclaration' && declaration.typeAnnotation?.type === 'TSTypeLiteral') {
      found.set(declaration.id.name, declaration.typeAnnotation.members)
    }
  }

  return found
}

// The annotation and the destructuring each know something the other does not:
// the annotation carries types and optionality, the destructuring carries
// defaults and every prop an `extends` clause hides. Merge rather than choose.
function fromDeclarator(declarator: Node, declared: Map<string, Node[]>): PropDefinition[] {
  const destructured = destructuredDefaults(declarator.id)
  const annotation = declarator.id.typeAnnotation?.typeAnnotation
  const members = annotation?.type === 'TSTypeReference'
    ? declared.get(nameOf(annotation.typeName) ?? '')
    : annotation?.type === 'TSTypeLiteral'
      ? annotation.members
      : undefined

  const defs: PropDefinition[] = []
  const seen = new Set<string>()

  for (const member of members ?? []) {
    if (member.type !== 'TSPropertySignature' || member.key?.type !== 'Identifier') {
      continue
    }
    const memberType = member.typeAnnotation?.typeAnnotation
    seen.add(member.key.name)
    if (isUndrivable(memberType) || INJECTED.has(member.key.name)) {
      continue
    }
    const value = literalValue(destructured.get(member.key.name))
    defs.push({
      name: member.key.name,
      types: typesFromAnnotation(memberType) ?? typesFromValue(value),
      required: !member.optional && destructured.get(member.key.name) === undefined && !acceptsUndefined(memberType),
      default: value,
    })
  }

  for (const [name, init] of destructured) {
    // `children` is the default snippet in runes mode; with no annotation to
    // read, the name is the only thing that says so.
    if (seen.has(name) || name === 'children' || INJECTED.has(name)) {
      continue
    }
    const value = literalValue(init)
    defs.push({ name, types: typesFromValue(value), required: false, default: value })
  }

  return defs
}

function destructuredDefaults(id: Node): Map<string, Node | undefined> {
  const found = new Map<string, Node | undefined>()

  if (id.type !== 'ObjectPattern') {
    return found
  }

  for (const property of id.properties) {
    if (property.type !== 'Property' || property.computed || property.key.type !== 'Identifier') {
      continue
    }
    found.set(
      property.key.name,
      property.value.type === 'AssignmentPattern' ? property.value.right : undefined,
    )
  }

  return found
}

// Only values a control can hold. `$bindable('x')` is the canonical way to
// default a bindable prop, and the value it wraps is one node deeper.
function literalValue(node: Node | undefined): any {
  if (!node) {
    return undefined
  }
  if (node.type === 'CallExpression' && node.callee?.name === '$bindable') {
    return literalValue(node.arguments?.[0])
  }
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument?.type === 'Literal') {
    return -node.argument.value
  }
  if (node.type !== 'Literal') {
    return undefined
  }
  return typeof node.value === 'bigint' || node.value instanceof RegExp ? undefined : node.value
}

/**
 * The props a component declares, or `undefined` when the source could not be
 * read — which is not the same as a component with no props, and a caller
 * deciding whether to show a panel has to tell them apart.
 */
export function extractPropDefs(source: string): PropDefinition[] | undefined {
  let ast: Node
  try {
    ast = parse(parseable(source), { modern: true })
  }
  catch {
    return undefined
  }

  // Types may be declared in the module script; props never are.
  const body = ast.instance?.content?.body ?? []
  const types = declaredTypes([...(ast.module?.content?.body ?? []), ...body])
  const runes = runesProps(body, types)
  return runes.length > 0 ? runes : legacyProps(body)
}
