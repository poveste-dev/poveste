type Parse = typeof import('svelte/compiler').parse

/** The estree fields this reads, loosely: the parse output is walked generically. */
interface Node {
  type: string
  start: number
  end: number
  name?: string
  value?: Node & { value?: string }
  key?: { name?: string, value?: string }
  id?: Node
  init?: Node
  right?: Node
  callee?: Node
  arguments?: Node[]
  properties?: Node[]
  declaration?: Node
  declarations?: Node[]
  kind?: string
}

function keyOf(property: Node): string | undefined {
  return property.key?.name ?? property.key?.value
}

/**
 * The defaults a component's own code applies, as written: a `$props()`
 * destructuring default, through `$bindable(...)`, or a Svelte 4 `export let`.
 */
export function svelteDefaults(parse: Parse, source: string): Map<string, string> {
  const defaults = new Map<string, string>()
  const ast = parse(source, { modern: true })
  const text = (node: Node) => source.slice(node.start, node.end)

  function visit(node: Node | undefined) {
    if (!node || typeof node !== 'object') {
      return
    }
    if (node.type === 'VariableDeclarator' && node.init?.type === 'CallExpression' && node.init.callee?.name === '$props' && node.id?.type === 'ObjectPattern') {
      for (const property of node.id.properties ?? []) {
        const name = keyOf(property)
        if (property.type !== 'Property' || property.value?.type !== 'AssignmentPattern' || !name) {
          continue
        }
        let value: Node | undefined = property.value.right
        if (value?.type === 'CallExpression' && value.callee?.name === '$bindable') {
          value = value.arguments?.[0]
        }
        if (value) {
          defaults.set(name, text(value))
        }
      }
    }
    if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration' && node.declaration.kind === 'let') {
      for (const declarator of node.declaration.declarations ?? []) {
        if (declarator.id?.type === 'Identifier' && declarator.id.name && declarator.init) {
          defaults.set(declarator.id.name, text(declarator.init))
        }
      }
    }
    for (const [key, value] of Object.entries(node as object)) {
      if (key === 'parent') {
        continue
      }
      if (Array.isArray(value)) {
        value.forEach(visit)
      }
      else if (value && typeof value === 'object' && 'type' in value) {
        visit(value as Node)
      }
    }
  }
  visit(ast.instance?.content as Node | undefined)
  return defaults
}
