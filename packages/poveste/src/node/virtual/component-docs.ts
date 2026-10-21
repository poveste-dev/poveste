import type { Context } from '../context.js'

export const COMPONENT_DOC_PREFIX = 'virtual:component-docs-data:'
export const RESOLVED_COMPONENT_DOC_PREFIX = `/__resolved__${COMPONENT_DOC_PREFIX}`

const indexes = new WeakMap<NonNullable<Context['componentDocs']>, { files: string[], results: Map<string, unknown> }>()

/** Every documented file once, so a component two stories import is one chunk; built once per build. */
function documentedFiles(ctx: Context): { files: string[], results: Map<string, unknown> } {
  const docs = ctx.componentDocs ?? {}
  let index = indexes.get(docs)
  if (!index) {
    const results = new Map(Object.values(docs).flatMap(components => Object.entries(components)))
    index = { files: [...results.keys()].sort(), results }
    indexes.set(docs, index)
  }
  return index
}

/**
 * Each story's components, as loaders of one chunk per component: opening a story's
 * Docs tab downloads its own tables, not the book's (#1429).
 */
export function componentDocsMap(ctx: Context): string {
  const index = new Map(documentedFiles(ctx).files.map((file, i) => [file, i]))
  const stories = Object.entries(ctx.componentDocs ?? {}).map(([storyId, components]) => {
    const loaders = Object.keys(components).map(file => `${JSON.stringify(file)}:()=>import(${JSON.stringify(`${COMPONENT_DOC_PREFIX}${index.get(file)}`)})`)
    return `${JSON.stringify(storyId)}:{${loaders.join(',')}}`
  })
  return `export const componentDocs = {${stories.join(',')}}\n`
}

export function componentDoc(ctx: Context, id: string): string | undefined {
  const { files, results } = documentedFiles(ctx)
  const file = files[Number(id.slice(RESOLVED_COMPONENT_DOC_PREFIX.length))]
  const result = file ? results.get(file) : undefined
  // A string, which the unminified build leaves compact, where it would print an object literal out in full.
  return result ? `export default JSON.parse(${JSON.stringify(JSON.stringify(result))})\n` : undefined
}
