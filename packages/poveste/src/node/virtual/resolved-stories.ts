import type { Context } from '../context.js'
import { makeTree } from '../tree.js'
import { jsString } from './codegen.js'

/**
 * How many times the story list has changed since the server started, per book.
 * A client that loaded the list before a change, and missed the update that
 * announced it, is told so when it mounts (#1218).
 */
export const storiesGeneration = new WeakMap<Context, number>()

export function resolvedStories(ctx: Context) {
  const resolvedStories = ctx.storyFiles.filter(s => !!s.story)
  const files = resolvedStories.map((file, index) => {
    return {
      id: file.id,
      path: file.treePath,
      filePath: file.relativePath,
      story: {
        ...file.story,
        docsText: undefined,
      },
      supportPluginId: file.supportPluginId,
      docsFilePath: file.markdownFile?.relativePath,
      index,
    }
  })
  return `${ctx.supportPlugins.map(p => p.importStoriesPrepend).filter(Boolean).join('\n')}
${resolvedStories.map((file, index) => {
  const supportPlugin = ctx.supportPlugins.find(p => p.id === file.supportPluginId)
  if (!supportPlugin) {
    throw new Error(`Could not find support plugin for story ${file.path}: ${file.supportPluginId}`)
  }
  return supportPlugin.importStoryComponent(file, index)
}).filter(Boolean).join('\n')}
export let files = [${files.map(file => `{${JSON.stringify(file).slice(1, -1)}, component: Comp${file.index}, source: () => import(${jsString(`virtual:story-source:${file.story.id}`)})}`).join(',\n')}]
export let tree = ${JSON.stringify(makeTree(ctx.config, resolvedStories))}
export let generation = ${storiesGeneration.get(ctx) ?? 0}
const handlers = []
export function onUpdate (cb) {
  handlers.push(cb)
}
if (import.meta.hot) {
  import.meta.hot.accept(newModule => {
    files = newModule.files
    tree = newModule.tree
    generation = newModule.generation
    handlers.forEach(h => {
      h(newModule.files, newModule.tree)
      newModule.onUpdate(h)
    })
  })
}`
}
