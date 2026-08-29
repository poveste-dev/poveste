// Reads a component's declared props out of its source.
//
// Vue gets this for free at runtime: a vnode carries `type.props`, so auto-props
// reads the tree it is about to render. A Svelte component compiles to a function
// that writes DOM, and keeps no description of what it accepts (#233) — so the
// only place the props still exist is the source, and this reads them there.
//
// `types` uses the vocabulary `ControlsComponentPropItem.vue` switches on —
// `string`, `number`, `boolean`, `array`, `object`, `unknown` — so a definition
// from here drives the existing controls panel with no changes to it.

import type { PropDefinition } from '@poveste/shared'
import { parse } from 'svelte/compiler'

type Node = any

function textOf(source: string, node: Node): string {
  return source.slice(node.start, node.end).trim()
}

// Maps a TypeScript annotation onto the control vocabulary. A union collapses to
// the set of its members, which is why `types` is a list: `string | number` has
// no single control, and the panel picks the first.
export function typesFromAnnotation(source: string, node: Node | undefined): string[] | undefined {
  if (!node) {
    return undefined
  }

  switch (node.type) {
    case 'TSStringKeyword':
      return ['string']
    case 'TSNumberKeyword':
      return ['number']
    case 'TSBooleanKeyword':
      return ['boolean']
    case 'TSArrayType':
      return ['array']
    case 'TSTypeLiteral':
      return ['object']
    case 'TSFunctionType':
      return ['unknown']
    case 'TSLiteralType':
      return typesFromLiteral(node.literal)
    case 'TSUnionType':
      return unionTypes(source, node)
    case 'TSTypeReference':
      return typesFromReference(textOf(source, node))
    default:
      return ['unknown']
  }
}

function typesFromLiteral(literal: Node): string[] {
  switch (typeof literal?.value) {
    case 'string':
      return ['string']
    case 'number':
      return ['number']
    case 'boolean':
      return ['boolean']
    default:
      return ['unknown']
  }
}

// `string | undefined` is the annotation an optional prop usually carries; the
// nullish members describe absence, not a control, so they drop out.
function unionTypes(source: string, node: Node): string[] {
  const members: string[] = node.types
    .filter((member: Node) => member.type !== 'TSUndefinedKeyword' && member.type !== 'TSNullKeyword')
    .flatMap((member: Node): string[] => typesFromAnnotation(source, member) ?? [])

  return [...new Set(members)]
}

// A snippet is slot content that happens to arrive as a prop. There is no control
// that can author one, and handing `children` to HstJson replaces the markup with
// a JSON blob — so these are not props the panel can offer.
export function isSnippet(node: Node | undefined): boolean {
  if (!node) {
    return false
  }
  if (node.type === 'TSUnionType') {
    return node.types.some((member: Node) => isSnippet(member))
  }
  return node.type === 'TSTypeReference' && node.typeName?.name === 'Snippet'
}

// `label: string | undefined` is how a legacy prop says it is optional; without
// this every un-initialised prop reads as required.
export function acceptsUndefined(node: Node | undefined): boolean {
  return node?.type === 'TSUnionType'
    && node.types.some((member: Node) => member.type === 'TSUndefinedKeyword')
}

function typesFromReference(text: string): string[] {
  if (/^Array\s*</.test(text) || /^(?:Readonly)?Array\b/.test(text)) {
    return ['array']
  }
  return ['unknown']
}

// Legacy mode. `export let x = 1` is a prop; `export const` and `export function`
// are not — Svelte treats those as read-only accessors on the component.
function legacyProps(source: string, body: Node[]): PropDefinition[] {
  const props: PropDefinition[] = []

  for (const node of body) {
    if (node.type !== 'ExportNamedDeclaration') {
      continue
    }
    const declaration = node.declaration
    if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'let') {
      continue
    }

    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier') {
        continue
      }
      const annotation = declarator.id.typeAnnotation?.typeAnnotation
      if (isSnippet(annotation)) {
        continue
      }
      props.push({
        name: declarator.id.name,
        types: typesFromAnnotation(source, annotation),
        required: !declarator.init && !acceptsUndefined(annotation),
        default: declarator.init ? literalValue(declarator.init) : undefined,
      })
    }
  }

  return props
}

// Runes mode. Names and defaults come from the destructuring; optionality and
// types come from the annotation, which is usually a reference to a `Props`
// interface declared in the same block.
function runesProps(source: string, body: Node[]): PropDefinition[] {
  const members = declaredTypes(body)

  for (const node of body) {
    if (node.type !== 'VariableDeclaration') {
      continue
    }
    for (const declarator of node.declarations) {
      if (declarator.init?.type !== 'CallExpression' || declarator.init.callee?.name !== '$props') {
        continue
      }
      if (declarator.id.type !== 'ObjectPattern') {
        continue
      }
      return fromPattern(source, declarator, members)
    }
  }

  return []
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

function fromPattern(source: string, declarator: Node, declared: Map<string, Node[]>): PropDefinition[] {
  const defaults = new Map<string, Node>()
  const rest: string[] = []

  for (const property of declarator.id.properties) {
    if (property.type !== 'Property' || property.key.type !== 'Identifier') {
      continue
    }
    rest.push(property.key.name)
    if (property.value.type === 'AssignmentPattern') {
      defaults.set(property.key.name, property.value.right)
    }
  }

  const annotation = declarator.id.typeAnnotation?.typeAnnotation
  const members = annotation?.type === 'TSTypeReference'
    ? declared.get(annotation.typeName?.name)
    : annotation?.type === 'TSTypeLiteral'
      ? annotation.members
      : undefined

  // The annotation is the better source: it carries every prop, including ones
  // the component never destructures, plus optionality. Without one, the
  // destructuring is all there is.
  if (!members) {
    return rest.map(name => ({
      name,
      required: !defaults.has(name),
      default: literalValue(defaults.get(name)),
    }))
  }

  return members
    .filter((member: Node) => member.type === 'TSPropertySignature' && member.key?.type === 'Identifier')
    .filter((member: Node) => !isSnippet(member.typeAnnotation?.typeAnnotation))
    .map((member: Node) => {
      const annotation = member.typeAnnotation?.typeAnnotation
      return {
        name: member.key.name,
        types: typesFromAnnotation(source, annotation),
        required: !member.optional && !defaults.has(member.key.name) && !acceptsUndefined(annotation),
        default: literalValue(defaults.get(member.key.name)),
      }
    })
}

// Only values that survive being handed to a control. An expression default
// (`{}`, `() => {}`, a call) has no meaning as a control value, and reporting
// its source text would put a string in a number field.
function literalValue(node: Node | undefined): any {
  if (!node) {
    return undefined
  }
  if (node.type === 'Literal') {
    return node.value
  }
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument?.type === 'Literal') {
    return -node.argument.value
  }
  return undefined
}

// Returns `[]` for a component with no props, and for one that cannot be parsed.
// A malformed component is already a build error with a better message than
// anything this could add; it must not also take collection down (#81).
export function extractPropDefs(source: string): PropDefinition[] {
  let body: Node[]
  try {
    body = (parse(source, { modern: true }) as any).instance?.content?.body ?? []
  }
  catch {
    return []
  }

  const runes = runesProps(source, body)
  return runes.length > 0 ? runes : legacyProps(source, body)
}
