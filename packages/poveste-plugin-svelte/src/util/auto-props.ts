import type { AutoPropComponentDefinition, PropDefinition } from '@poveste/shared'
import { parse } from 'svelte/compiler'

/** Resolves an import specifier from the story file to that component's props. */
export type PropsOf = (specifier: string) => Promise<PropDefinition[] | undefined>

const RUNTIME = '@poveste/plugin-svelte/auto-props'
const HOLDER = '__pvtAutoProps'

// Erased for parsing only, and replaced by spaces rather than removed so every
// offset still points at the same character of the original source.
//
// `import type { Hst }` beside `export let Hst: Hst` is a duplicate declaration
// to the parser, and that is the shape of every TypeScript story here. Without
// this the transform parses only after something else has already stripped the
// types, which is an ordering accident rather than a contract.
const TYPE_IMPORT = /^[ \t]*import\s+type\b[^;]+?\bfrom[ \t]*(['"])[^'"]*\1(?:[ \t]*;)?[ \t]*$/gm
const IMPORT_BRACES = /\bimport\s*\{[^}]*\}/g
const INLINE_TYPE = /\btype\s+[A-Za-z_$][\w$]*\s*,?/g

function blank(match: string): string {
  return ' '.repeat(match.length)
}

export function parseable(code: string): string {
  return code
    .replace(TYPE_IMPORT, blank)
    .replace(IMPORT_BRACES, braces => braces.replace(INLINE_TYPE, blank))
}

interface Node { type: string, start: number, end: number, [key: string]: any }
interface Target { node: Node, variant: number, index: number, specifier: string }

/**
 * Gives a Svelte story the auto-props Vue gets for free.
 *
 * Vue reads props off the vnodes a variant is about to render and writes control
 * values back into that same tree. Svelte renders straight to the DOM, so there
 * is no tree to read or write — the equivalent has to happen before the compiler
 * runs: every component a variant renders takes a spread of the values the
 * controls hold, and the props they offer are read out of the component's own
 * source (#233).
 *
 * Returns undefined when there is nothing to do, which is the common case — a
 * story that renders no component with props is left byte-for-byte alone.
 */
export async function transformStoryAutoProps(code: string, propsOf: PropsOf): Promise<string | undefined> {
  let ast: any
  try {
    ast = parse(parseable(code), { modern: true })
  }
  catch {
    return undefined
  }

  const instance = ast.instance
  if (!instance) {
    return undefined
  }

  const imported = importedComponents(instance.content?.body ?? [])
  if (imported.size === 0) {
    return undefined
  }

  const targets = collectTargets(ast.fragment, imported)
  if (targets === undefined || targets.length === 0) {
    return undefined
  }

  const defs = await describe(targets, propsOf)
  if (defs.every(perVariant => perVariant.length === 0)) {
    return undefined
  }

  return splice(code, instance.content.start, targets, defs)
}

// Default imports of `.svelte` files, which is the only shape a component can
// arrive in. A named or namespace import is something else.
function importedComponents(body: Node[]): Map<string, string> {
  const found = new Map<string, string>()
  for (const node of body) {
    if (node.type !== 'ImportDeclaration' || !/\.svelte$/.test(node.source?.value ?? '')) {
      continue
    }
    for (const specifier of node.specifiers ?? []) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        found.set(specifier.local.name, node.source.value)
      }
    }
  }
  return found
}

/**
 * Every imported component a variant renders, numbered within its variant —
 * which is how `_hPropState` is keyed, so the numbering is a contract with the
 * controls panel rather than a detail.
 *
 * Undefined means "do not touch this story": a variant produced by a block
 * cannot be numbered statically, and a wrong number would drive the wrong
 * component.
 */
function collectTargets(fragment: Node, imported: Map<string, string>): Target[] | undefined {
  const story = findStory(fragment)
  if (!story) {
    return undefined
  }

  const variants = story.fragment?.nodes?.filter((node: Node) => isHst(node, 'Variant')) ?? []
  if (blockWrapsAVariant(story.fragment, imported)) {
    return undefined
  }

  // A story with no explicit variants renders its own children as the implicit
  // `_default` variant, which is variant zero either way.
  const scopes: Node[] = variants.length > 0 ? variants : [story]

  const targets: Target[] = []
  scopes.forEach((scope, variant) => {
    let index = 0
    walk(scope.fragment, (node) => {
      if (node.type !== 'Component' || isHst(node)) {
        return
      }
      const specifier = imported.get(node.name)
      if (specifier) {
        targets.push({ node, variant, index: index++, specifier })
      }
    })
  })
  return targets
}

function findStory(fragment: Node): Node | undefined {
  let found: Node | undefined
  walk(fragment, (node) => {
    if (!found && isHst(node, 'Story')) {
      found = node
    }
  })
  return found
}

// A variant inside `{#each}` or `{#if}` is one the numbering cannot account for.
function blockWrapsAVariant(fragment: Node, imported: Map<string, string>): boolean {
  let wrapped = false
  walk(fragment, (node, ancestors) => {
    if (!isHst(node, 'Variant') && !(node.type === 'Component' && imported.has(node.name))) {
      return
    }
    if (ancestors.some(ancestor => ancestor.type.endsWith('Block') && ancestor.type !== 'SnippetBlock')) {
      wrapped = true
    }
  })
  return wrapped
}

function isHst(node: Node, member?: string): boolean {
  return node.type === 'Component' && (member ? node.name === `Hst.${member}` : node.name?.startsWith('Hst.'))
}

function walk(node: any, visit: (node: Node, ancestors: Node[]) => void, ancestors: Node[] = []): void {
  if (!node || typeof node !== 'object') {
    return
  }
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, ancestors)
    return
  }
  if (typeof node.type === 'string') {
    visit(node, ancestors)
    ancestors = [...ancestors, node]
  }
  for (const key of ['fragment', 'nodes', 'children', 'body', 'consequent', 'alternate']) {
    if (node[key]) walk(node[key], visit, ancestors)
  }
}

async function describe(targets: Target[], propsOf: PropsOf): Promise<AutoPropComponentDefinition[][]> {
  const sources = new Map<string, Promise<PropDefinition[] | undefined>>()
  for (const target of targets) {
    if (!sources.has(target.specifier)) {
      sources.set(target.specifier, propsOf(target.specifier))
    }
  }

  const defs: AutoPropComponentDefinition[][] = []
  for (const target of targets) {
    defs[target.variant] ??= []
    const props = await sources.get(target.specifier)
    if (props?.length) {
      defs[target.variant].push({ name: target.node.name, index: target.index, props })
    }
  }
  for (let variant = 0; variant < defs.length; variant++) {
    defs[variant] ??= []
  }
  return defs
}

/**
 * Edits back to front, so an earlier insertion cannot move a later offset.
 *
 * The spread goes after the last attribute: last wins in Svelte, so a prop the
 * story binds itself keeps winning until the reader touches that control — the
 * same precedence Vue's write-into-the-vnode gives.
 */
function splice(code: string, scriptStart: number, targets: Target[], defs: AutoPropComponentDefinition[][]): string {
  const driven = new Set(defs.flatMap((perVariant, variant) => perVariant.map(def => `${variant}:${def.index}`)))

  const edits = targets
    .filter(target => driven.has(`${target.variant}:${target.index}`))
    .map(target => ({
      at: attributesEnd(code, target.node),
      text: ` {...$${HOLDER}[${target.variant}][${target.index}]}`,
    }))

  // One line, and it lands at the end of the `<script>` line where no user code
  // is. Nothing the story wrote moves to a different line, so a compile error
  // still points at the line the author is looking at and the transform needs no
  // source map to stay honest.
  edits.push({
    at: scriptStart,
    text: `import { autoProps as __pvtCreateAutoProps } from '${RUNTIME}';const ${HOLDER} = __pvtCreateAutoProps(${JSON.stringify(defs)});`,
  })

  let result = code
  for (const edit of edits.sort((a, b) => b.at - a.at)) {
    result = result.slice(0, edit.at) + edit.text + result.slice(edit.at)
  }
  return result
}

function attributesEnd(code: string, node: Node): number {
  const attributes = node.attributes ?? []
  if (attributes.length > 0) {
    return Math.max(...attributes.map((attribute: Node) => attribute.end))
  }
  return code.indexOf(node.name, node.start) + node.name.length
}
