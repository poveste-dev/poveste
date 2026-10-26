import { readFileSync, statSync } from 'node:fs'
import { parseSync } from 'vite'

/** Resolves an import the way the book's Vite config does, to an absolute file. */
export type Resolve = (specifier: string, importer: string) => Promise<string | undefined>

/** Where a name comes from: `imported` from `source`, or a local binding when `source` is empty. */
interface Binding {
  source: string
  imported: string
}

interface ModuleShape {
  imports: Map<string, Binding>
  exports: Map<string, Binding>
  stars: string[]
  /** A story's `component` field, as the identifiers it names. */
  named: string[]
}

const SCRIPT = /\.[cm]?[jt]sx?$/
const SCRIPT_BLOCK = /<script\b([^>]*)>([\s\S]*?)<\/script>/g
const MAX_DEPTH = 32

const shapes = new Map<string, { mtimeMs: number, shape: ModuleShape }>()

function nameOf(node: { type: string, name?: string, value?: unknown }): string {
  return node.type === 'Identifier' ? node.name! : String(node.value)
}

type Lang = 'js' | 'jsx' | 'ts' | 'tsx'

function parseInto(shape: ModuleShape, file: string, code: string, lang: Lang) {
  const { program, errors } = parseSync(file, code, { lang })
  // A file that does not parse is read for nothing rather than for half its imports.
  if (errors.length) {
    return
  }
  for (const node of program.body) {
    const typeOnly = (node as { importKind?: string, exportKind?: string }).importKind === 'type' || (node as { exportKind?: string }).exportKind === 'type'
    if (typeOnly) {
      continue
    }
    if (node.type === 'ImportDeclaration') {
      const source = String(node.source.value)
      for (const specifier of node.specifiers) {
        if ((specifier as { importKind?: string }).importKind === 'type') {
          continue
        }
        const imported = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.type === 'ImportNamespaceSpecifier' ? '*' : nameOf(specifier.imported)
        shape.imports.set(specifier.local.name, { source, imported })
      }
    }
    else if (node.type === 'ExportNamedDeclaration') {
      const source = node.source ? String(node.source.value) : ''
      for (const specifier of node.specifiers) {
        if ((specifier as { exportKind?: string }).exportKind !== 'type') {
          shape.exports.set(nameOf(specifier.exported), { source, imported: nameOf(specifier.local) })
        }
      }
    }
    else if (node.type === 'ExportDefaultDeclaration') {
      // An expression, such as `defineComponent({…})`, is a value this file defines, so it imports nothing.
      shape.exports.set('default', { source: '', imported: node.declaration.type === 'Identifier' ? node.declaration.name : '' })
    }
    else if (node.type === 'ExportAllDeclaration' && !node.exported) {
      shape.stars.push(String(node.source.value))
    }
  }
}

/**
 * Whether a JSX story's default export can name a `component`. False only when it is
 * an object, or `defineStory` of one, that has no `component` key and no spread: the
 * extractor would start, with its type checker, to read nothing (#1510). Anything
 * else is left to the extractor, which reads the story with types.
 */
export function mayNameComponent(file: string): boolean {
  const lang = file.match(/\.[cm]?([jt]sx?)$/)?.[1] as Lang | undefined
  let code: string
  try {
    code = readFileSync(file, 'utf8')
  }
  catch {
    return true
  }
  const { program, errors } = parseSync(file, code, { lang: lang ?? 'tsx' })
  if (errors.length) {
    return true
  }
  interface Node {
    type: string
    name?: string
    value?: unknown
    declaration?: Node
    declarations?: { id: Node, init?: Node }[]
    expression?: Node
    arguments?: Node[]
    properties?: (Node & { key: Node })[]
  }
  const body = program.body as Node[]
  let value = body.find(node => node.type === 'ExportDefaultDeclaration')?.declaration
  if (value?.type === 'Identifier') {
    const name = value.name
    value = body.flatMap(node => node.declarations ?? []).find(declarator => declarator.id.name === name)?.init
  }
  while (value?.expression && ['TSAsExpression', 'TSSatisfiesExpression', 'ParenthesizedExpression'].includes(value.type)) {
    value = value.expression
  }
  if (value?.type === 'CallExpression') {
    value = value.arguments?.[0]
  }
  if (value?.type !== 'ObjectExpression') {
    return true
  }
  return (value.properties ?? []).some(property => property.type !== 'Property' || nameOf(property.key) === 'component')
}

/** The identifiers in a Vue `<Story :component="…">` or a Svelte `<Hst.Story component={…}>`. */
function storyComponentField(source: string): string[] {
  const tag = /<(?:Hst\.)?Story\b/g
  const attribute = /\s*([:@\w.-]+)(?:\s*=\s*("[^"]*"|'[^']*'|\{[^}]*\}))?/y
  const named: string[] = []
  for (const match of source.matchAll(tag)) {
    attribute.lastIndex = match.index + match[0].length
    for (let found = attribute.exec(source); found && found[1]; found = attribute.exec(source)) {
      if (/^(?::|v-bind:)?component$/.test(found[1]) && found[2]) {
        named.push(...found[2].slice(1, -1).match(/[A-Z_$][\w$]*(?:\.[A-Z_$][\w$]*)*/gi) ?? [])
      }
    }
  }
  return named
}

/** What a file imports and exports, from its source; a single-file component is read through its `<script>` blocks. */
function shapeOf(file: string): ModuleShape {
  const { mtimeMs } = statSync(file)
  const cached = shapes.get(file)
  if (cached?.mtimeMs === mtimeMs) {
    return cached.shape
  }
  const shape: ModuleShape = { imports: new Map(), exports: new Map(), stars: [], named: [] }
  const source = readFileSync(file, 'utf8')
  if (SCRIPT.test(file)) {
    parseInto(shape, file, source, file.match(/\.[cm]?([jt]sx?)$/)![1] as Lang)
  }
  else {
    // TypeScript reads plain JavaScript too, so a block without `lang` parses as `ts`.
    for (const [, attributes, code] of source.matchAll(SCRIPT_BLOCK)) {
      parseInto(shape, file, code!, /\blang=["']tsx["']/.test(attributes!) ? 'tsx' : /\blang=["']jsx["']/.test(attributes!) ? 'jsx' : 'ts')
    }
    shape.named = storyComponentField(source)
  }
  shapes.set(file, { mtimeMs, shape })
  return shape
}

/**
 * The component file `name` reaches from `file`, through `export … from`, `export *` and
 * a re-exported import, as a story importing from a barrel does (#1432). A component is
 * a non-script file reached as its default export, such as `export { default as SelectRoot } from './SelectRoot.vue'`,
 * or a script file's own default export, such as `export default defineComponent({…})` (#1463).
 * Whether that one is a component is the framework's extractor's to say.
 */
export async function followName(file: string, name: string, resolve: Resolve, depth = 0): Promise<string | undefined> {
  if (!SCRIPT.test(file)) {
    return name === 'default' ? file : undefined
  }
  if (depth > MAX_DEPTH || file.includes('/node_modules/')) {
    return undefined
  }
  const shape = shapeOf(file)
  const exported = shape.exports.get(name)
  if (exported) {
    const binding = exported.source ? exported : shape.imports.get(exported.imported)
    if (!binding) {
      return name === 'default' ? file : undefined
    }
    if (binding.imported === '*') {
      return undefined
    }
    const target = await resolve(binding.source, file)
    return target && followName(target, binding.imported, resolve, depth + 1)
  }
  if (name === 'default') {
    return undefined
  }
  for (const star of shape.stars) {
    const target = await resolve(star, file)
    const found = target && await followName(target, name, resolve, depth + 1)
    if (found) {
      return found
    }
  }
  return undefined
}

/**
 * The component files a story names: its `component` field when it has one, else every
 * value it imports from the book, followed through re-exports. A capitalised import that
 * reaches no component is counted in `unresolved`, so the Docs tab can say why it has no table.
 */
export async function storyComponents(storyFile: string, resolve: Resolve): Promise<{ files: string[], named: boolean, unresolved: number }> {
  const shape = shapeOf(storyFile)
  const named = shape.named.length > 0
  const files = new Set<string>()
  let unresolved = 0
  for (const local of named ? shape.named : [...shape.imports.keys()]) {
    const [head, member] = local.split('.')
    const binding = shape.imports.get(head!)
    const target = binding && (binding.imported === '*') === (member !== undefined) ? await resolve(binding.source, storyFile) : undefined
    // A package's own exports, such as `vue` or `@iconify/vue`, are not the book's components.
    if (!named && (!target || target.includes('/node_modules/'))) {
      continue
    }
    const found = target && await followName(target, member ?? binding!.imported, resolve)
    if (found) {
      files.add(found)
    }
    else if (named || /^[A-Z]/.test(local)) {
      unresolved++
    }
  }
  return { files: [...files], named, unresolved }
}
