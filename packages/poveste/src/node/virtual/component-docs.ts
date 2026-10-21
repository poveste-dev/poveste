import type { Context } from '../context.js'

export const COMPONENT_DOC_PREFIX = 'virtual:component-docs-data:'
export const RESOLVED_COMPONENT_DOC_PREFIX = `/__resolved__${COMPONENT_DOC_PREFIX}`

/** Every documented file once, so a component two stories import is one chunk. */
function documentedFiles(ctx: Context): string[] {
  return [...new Set(Object.values(ctx.componentDocs ?? {}).flatMap(Object.keys))].sort()
}

/**
 * Each story's components, as loaders of one chunk per component: opening a story's
 * Docs tab downloads its own tables, not the book's (#1429).
 */
export function componentDocsMap(ctx: Context): string {
  const index = new Map(documentedFiles(ctx).map((file, i) => [file, i]))
  const stories = Object.entries(ctx.componentDocs ?? {}).map(([storyId, components]) => {
    const loaders = Object.keys(components).map(file => `${JSON.stringify(file)}:()=>import(${JSON.stringify(`${COMPONENT_DOC_PREFIX}${index.get(file)}`)})`)
    return `${JSON.stringify(storyId)}:{${loaders.join(',')}}`
  })
  return `export const componentDocs = {${stories.join(',')}}\n`
}

export function componentDoc(ctx: Context, id: string): string | undefined {
  const file = documentedFiles(ctx)[Number(id.slice(RESOLVED_COMPONENT_DOC_PREFIX.length))]
  const result = file ? Object.values(ctx.componentDocs!).find(components => components[file])?.[file] : undefined
  // A string, which the unminified build leaves compact, where it would print an object literal out in full.
  return result ? `export default JSON.parse(${JSON.stringify(JSON.stringify(result))})\n` : undefined
}
