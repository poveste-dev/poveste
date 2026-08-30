import type { AutoPropComponentDefinition, PropDefinition } from '@poveste/shared'
import { parse } from 'svelte/compiler'

/** Resolves an import specifier from the story file to that component's props. */
export type PropsOf = (specifier: string) => Promise<PropDefinition[] | undefined>

const RUNTIME = '@poveste/plugin-svelte/auto-props'
const HOLDER = '__pvtAutoProps'
const TABLE = '__pvtAutoPropDefs'
const HST = 'Hst'

// Line-anchored and newline-free: `[^;\n]` stops a match running past its own
// line into the next import. A trailing line comment is tolerated because one
// was enough to blank the import below it.
const TYPE_IMPORT = /^[ \t]*import\s+type\b[^;\n]+?\bfrom[ \t]*(['"])[^'"\n]*\1(?:[ \t]*;)?[ \t]*(?:\/\/[^\n]*)?$/gm
const IMPORT_BRACES = /\bimport\s*\{[^}]*\}/g
const INLINE_TYPE = /\btype\s+[A-Za-z_$][\w$]*(?:\s+as\s+[A-Za-z_$][\w$]*)?\s*,?/g

// Blanked rather than removed, so every offset still points at the same
// character. `import type { Hst }` beside `export let Hst: Hst` is a duplicate
// declaration to the parser, and that is the shape of every TypeScript story.
export function parseable(code: string): string {
  return code
    .replace(TYPE_IMPORT, blank)
    .replace(IMPORT_BRACES, braces => braces.replace(INLINE_TYPE, blank))
}

function blank(match: string): string {
  return ' '.repeat(match.length)
}

interface Node { type: string, start: number, end: number, [key: string]: any }
interface Target { node: Node, variant: number, index: number, specifier: string }

/**
 * Gives a Svelte story the auto-props Vue reads off its vnodes: every component
 * a variant renders takes a spread of the values its controls hold, and the
 * props on offer come from the component's own source (#233).
 */
export async function transformStoryAutoProps(code: string, propsOf: PropsOf): Promise<string | undefined> {
  // Applied twice — a plugin registered twice, or output fed back in — the
  // second preamble redeclares the first and nothing compiles.
  if (code.includes(RUNTIME)) {
    return undefined
  }

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
// arrive in.
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
 * Every component a variant renders, numbered within its variant — which is how
 * `_hPropState` is keyed, so the numbering is a contract with the panel.
 *
 * Undefined means "do not touch this story": a variant produced by a block is
 * registered at runtime in an order no static pass can predict.
 */
function collectTargets(fragment: Node, imported: Map<string, string>): Target[] | undefined {
  const story = findStory(fragment)
  if (!story || blockWrapsAVariant(story.fragment)) {
    return undefined
  }

  // At any depth and in document order, matching how `collect/Variant.svelte`
  // registers them — a plain wrapper element around the variants must not
  // renumber them. A story with none renders its own children as variant zero.
  const variants: Node[] = []
  walk(story.fragment, (node) => {
    if (isHst(node, 'Variant')) {
      variants.push(node)
    }
  })
  const scopes = variants.length > 0 ? variants : [story]

  const targets: Target[] = []
  scopes.forEach((scope, variant) => {
    let index = 0
    walk(scope.fragment, (node, ancestors) => {
      // The controls snippet builds the panel rather than the preview, and Vue
      // scans only the default slot. A component in a block is skipped on its
      // own; the variant's other components keep their numbering.
      if (isControls(node)) {
        return false
      }
      if (node.type !== 'Component' || insideBlock(ancestors)) {
        return undefined
      }
      const specifier = imported.get(node.name)
      if (specifier) {
        targets.push({ node, variant, index: index++, specifier })
      }
      return undefined
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

function blockWrapsAVariant(fragment: Node): boolean {
  let wrapped = false
  walk(fragment, (node, ancestors) => {
    if (isHst(node, 'Variant') && insideBlock(ancestors)) {
      wrapped = true
    }
  })
  return wrapped
}

function insideBlock(ancestors: Node[]): boolean {
  return ancestors.some(ancestor => ancestor.type.endsWith('Block') && ancestor.type !== 'SnippetBlock')
}

function isControls(node: Node): boolean {
  if (node.type === 'SnippetBlock') {
    return node.expression?.name === 'controls'
  }
  return (node.attributes ?? []).some((attribute: Node) =>
    attribute.name === 'slot' && attribute.value?.[0]?.data === 'controls')
}

function isHst(node: Node, member?: string): boolean {
  return node.type === 'Component' && (member ? node.name === `${HST}.${member}` : node.name?.startsWith(`${HST}.`))
}

// `visit` returns false to leave a subtree alone. `then`/`catch`/`pending` and
// `fallback` are branches a variant can hide in, so the guard above has to see
// them.
const CHILD_KEYS = ['fragment', 'nodes', 'children', 'body', 'consequent', 'alternate', 'pending', 'then', 'catch', 'fallback']

function walk(node: any, visit: (node: Node, ancestors: Node[]) => boolean | void, ancestors: Node[] = []): void {
  if (!node || typeof node !== 'object') {
    return
  }
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, ancestors)
    return
  }
  if (typeof node.type === 'string') {
    if (visit(node, ancestors) === false) {
      return
    }
    ancestors = [...ancestors, node]
  }
  for (const key of CHILD_KEYS) {
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

  const size = targets.reduce((max, target) => Math.max(max, target.variant + 1), 0)
  const defs: AutoPropComponentDefinition[][] = Array.from({ length: size }, () => [])
  for (const target of targets) {
    const props = await sources.get(target.specifier)
    if (props?.length) {
      defs[target.variant].push({ name: target.node.name, index: target.index, props })
    }
  }
  return defs
}

/**
 * Edits back to front, so an earlier insertion cannot move a later offset. The
 * spread goes after the last attribute: last wins in Svelte, so a prop the story
 * binds keeps winning until the reader touches that control.
 */
function splice(code: string, scriptStart: number, targets: Target[], defs: AutoPropComponentDefinition[][]): string {
  const driven = new Set(defs.flatMap((perVariant, variant) => perVariant.map(def => `${variant}:${def.index}`)))

  const edits = targets
    .filter(target => driven.has(`${target.variant}:${target.index}`))
    .map(target => ({
      at: attributesEnd(code, target.node),
      text: ` {...$${HOLDER}[${target.variant}][${target.index}]}`,
    }))

  // One line, landing at the end of the `<script>` line where no user code is,
  // so nothing the story wrote moves and no source map is needed.
  edits.push({ at: scriptStart, text: preamble(defs) })

  let result = code
  for (const edit of edits.sort((a, b) => b.at - a.at)) {
    result = result.slice(0, edit.at) + edit.text + result.slice(edit.at)
  }
  return result
}

// A component used by several variants is serialised once and referenced, or a
// hundred-variant story carries a hundred copies of its prop table.
function preamble(defs: AutoPropComponentDefinition[][]): string {
  const table: string[] = []
  const entries = defs.map(perVariant => perVariant.map((def) => {
    const serialised = literal({ name: def.name, props: def.props })
    let slot = table.indexOf(serialised)
    if (slot < 0) {
      slot = table.push(serialised) - 1
    }
    return `{...${TABLE}[${slot}],index:${def.index}}`
  }))

  return `import { autoProps as __pvtCreateAutoProps } from '${RUNTIME}';`
    + `const ${TABLE} = [${table.join(',')}];`
    + `const ${HOLDER} = __pvtCreateAutoProps([${entries.map(perVariant => `[${perVariant.join(',')}]`).join(',')}]);`
}

// `</script>` in a prop default would close the block this lands in, and a raw
// line separator is not valid everywhere a string literal is.
function literal(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function attributesEnd(code: string, node: Node): number {
  const attributes = node.attributes ?? []
  if (attributes.length > 0) {
    return Math.max(...attributes.map((attribute: Node) => attribute.end))
  }
  return code.indexOf(node.name, node.start) + node.name.length
}
