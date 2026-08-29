// A compiled Svelte component keeps no record of what it accepts, the way a Vue
// vnode does, so the source is the only place its props still exist (#233).

import type { PropDefinition } from '@poveste/shared'
import { parse } from 'svelte/compiler'

type Node = any

// Poveste injects this into every story file; no user sets it.
const INJECTED = 'Hst'

const SCRIPT_BLOCK = /<script[^>]*>[\s\S]*?<\/script>/gi
// Line-anchored: a mention in a comment must not start a match.
const TYPE_IMPORT = /^[ \t]*import\s+type\b[^;]+?\bfrom[ \t]*(['"])[^'"]*\1(?:[ \t]*;)?[ \t]*$/gm
const IMPORT_BRACES = /\bimport\s*\{([^}]*)\}/g

// Script blocks only: props live nowhere else, and a preprocessed `<style>`
// never reaches the parser to throw. Type-only imports still go, both spellings
// — `import type { Hst }` beside `export let Hst: Hst` reads as a redeclaration.
function parseable(source: string): string {
  return (source.match(SCRIPT_BLOCK) ?? [])
    .join('\n')
    .replace(TYPE_IMPORT, '')
    .replace(IMPORT_BRACES, (_, specifiers: string) => {
      const kept = specifiers.split(',').map(s => s.trim()).filter(s => s && !/^type\s/.test(s))
      return `import { ${kept.join(', ')} }`
    })
}

function nameOf(typeName: Node | undefined): string | undefined {
  return typeName?.name ?? typeName?.right?.name
}

function withoutNullish(types: Node[]): Node[] {
  return types.filter((m: Node) => m.type !== 'TSUndefinedKeyword' && m.type !== 'TSNullKeyword')
}

// Slot content, which no control can author. Function props are kept — Vue's
// auto-props lists them too.
function isSnippet(node: Node | undefined): boolean {
  if (!node) {
    return false
  }
  if (node.type === 'TSParenthesizedType') {
    return isSnippet(node.typeAnnotation)
  }
  if (node.type === 'TSUnionType') {
    const real = withoutNullish(node.types)
    return real.length > 0 && real.every((m: Node) => isSnippet(m))
  }
  return nameOf(node.typeName) === 'Snippet'
}

// Only `undefined` makes a prop omittable; `string | null` still has to be passed.
function acceptsUndefined(node: Node | undefined): boolean {
  if (node?.type === 'TSParenthesizedType') {
    return acceptsUndefined(node.typeAnnotation)
  }
  return node?.type === 'TSUnionType'
    && node.types.some((m: Node) => m.type === 'TSUndefinedKeyword')
}

function typesFromAnnotation(node: Node | undefined): string[] | undefined {
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
    case 'TSLiteralType': return [typeName(literalValue(node.literal))]
    case 'TSUnionType': return unionTypes(node)
    case 'TSTypeReference':
      return ['Array', 'ReadonlyArray'].includes(nameOf(node.typeName) ?? '') ? ['array'] : ['unknown']
    default: return ['unknown']
  }
}

function typeName(value: unknown): string {
  switch (typeof value) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    default: return 'unknown'
  }
}

// `unknown` sorts last because the panel reads `types[0]`, so a concrete type
// wins however the union was written.
function unionTypes(node: Node): string[] {
  const members: string[] = withoutNullish(node.types)
    .flatMap((m: Node): string[] => typesFromAnnotation(m) ?? [])

  return [...new Set(members)].sort((a, b) => Number(a === 'unknown') - Number(b === 'unknown'))
}

function typesFromValue(value: unknown): string[] | undefined {
  const name = typeName(value)
  return name === 'unknown' ? undefined : [name]
}

// The only place a definition is built, so the filters cannot be bypassed.
function propDef(name: string, annotation: Node | undefined, init: Node | undefined, optional: boolean): PropDefinition | undefined {
  if (name === INJECTED || isSnippet(annotation)) {
    return undefined
  }
  const value = literalValue(init)
  return {
    name,
    types: typesFromAnnotation(annotation) ?? typesFromValue(value),
    required: !optional && init == null && !acceptsUndefined(annotation),
    default: value,
  }
}

interface Binding { kind: string, annotation?: Node, init?: Node }

function localBindings(body: Node[]): Map<string, Binding> {
  const found = new Map<string, Binding>()

  for (const node of body) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node
    if (declaration?.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === 'Identifier') {
          found.set(declarator.id.name, {
            kind: declaration.kind,
            annotation: declarator.id.typeAnnotation?.typeAnnotation,
            init: declarator.init,
          })
        }
      }
    }
    if (declaration?.type === 'FunctionDeclaration' && declaration.id) {
      found.set(declaration.id.name, { kind: 'function' })
    }
  }

  return found
}

// `export let x` is a prop, and `export { x as y }` when `x` is a `let`. An
// accessor, a re-export and a type-only export are not.
function legacyProps(body: Node[]): PropDefinition[] {
  const props: PropDefinition[] = []
  const locals = localBindings(body)

  for (const node of body) {
    if (node.type !== 'ExportNamedDeclaration' || node.exportKind === 'type' || node.source) {
      continue
    }

    if (!node.declaration && node.specifiers?.length) {
      for (const specifier of node.specifiers) {
        const local = locals.get(specifier.local?.name)
        const def = local?.kind === 'let'
          ? propDef(specifier.exported?.name, local.annotation, local.init, false)
          : undefined
        if (def) {
          props.push(def)
        }
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
      const def = propDef(declarator.id.name, declarator.id.typeAnnotation?.typeAnnotation, declarator.init, false)
      if (def) {
        props.push(def)
      }
    }
  }

  return props
}

function runesProps(body: Node[], declared: Map<string, Node>): PropDefinition[] {
  const declarator = body
    .filter((node: Node) => node.type === 'VariableDeclaration')
    .flatMap((node: Node) => node.declarations)
    .find((d: Node) => d.init?.type === 'CallExpression' && d.init.callee?.name === '$props')

  return declarator ? fromDeclarator(declarator, declared) : []
}

function declaredTypes(body: Node[]): Map<string, Node> {
  const found = new Map<string, Node>()

  for (const node of body) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node
    if (declaration?.type === 'TSInterfaceDeclaration') {
      found.set(declaration.id.name, { type: 'TSTypeLiteral', members: declaration.body.body })
    }
    if (declaration?.type === 'TSTypeAliasDeclaration') {
      found.set(declaration.id.name, declaration.typeAnnotation)
    }
  }

  return found
}

// An alias may intersect literals and other declared names.
function membersOf(node: Node | undefined, declared: Map<string, Node>, depth = 0): Node[] | undefined {
  if (!node || depth > 4) {
    return undefined
  }
  if (node.type === 'TSTypeLiteral') {
    return node.members
  }
  if (node.type === 'TSTypeReference') {
    return membersOf(declared.get(nameOf(node.typeName) ?? ''), declared, depth + 1)
  }
  if (node.type === 'TSIntersectionType') {
    const parts = node.types.flatMap((t: Node) => membersOf(t, declared, depth + 1) ?? [])
    return parts.length > 0 ? parts : undefined
  }
  return undefined
}

// The annotation and the destructuring each know something the other does not:
// the annotation carries types and optionality, the destructuring carries
// defaults and every prop an `extends` clause hides. Merge rather than choose.
function fromDeclarator(declarator: Node, declared: Map<string, Node>): PropDefinition[] {
  const destructured = destructuredDefaults(declarator.id)
  const members = membersOf(declarator.id.typeAnnotation?.typeAnnotation, declared)

  const defs: PropDefinition[] = []
  const seen = new Set<string>()

  for (const member of members ?? []) {
    if (member.key?.type !== 'Identifier') {
      continue
    }
    // Seen before the kind check, so a method signature is not re-added below.
    seen.add(member.key.name)
    if (member.type !== 'TSPropertySignature') {
      continue
    }
    const def = propDef(
      member.key.name,
      member.typeAnnotation?.typeAnnotation,
      destructured.get(member.key.name),
      member.optional,
    )
    if (def) {
      defs.push(def)
    }
  }

  for (const [name, init] of destructured) {
    // `children` is the default snippet in runes mode; with no annotation to
    // read, the name is the only thing that says so.
    if (seen.has(name) || name === 'children') {
      continue
    }
    // Unannotated, the destructuring is the only signal; annotated, an
    // inherited prop's optionality is unknowable.
    const def = propDef(name, undefined, init, members !== undefined)
    if (def) {
      defs.push(def)
    }
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

// Only what a control can hold and JSON can carry. A `$bindable` default is one
// node deeper.
function literalValue(node: Node | undefined): any {
  if (!node) {
    return undefined
  }
  if (node.type === 'CallExpression' && node.callee?.name === '$bindable') {
    return literalValue(node.arguments?.[0])
  }
  if (node.type === 'UnaryExpression' && node.operator === '-') {
    const inner = literalValue(node.argument)
    return typeof inner === 'number' ? -inner : undefined
  }
  if (node.type !== 'Literal') {
    return undefined
  }
  return typeof node.value === 'bigint' || node.value instanceof RegExp ? undefined : node.value
}

/** The props declared, or `undefined` when the source could not be read. */
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
  const declared = declaredTypes([...(ast.module?.content?.body ?? []), ...body])
  const runes = runesProps(body, declared)
  return runes.length > 0 ? runes : legacyProps(body)
}
