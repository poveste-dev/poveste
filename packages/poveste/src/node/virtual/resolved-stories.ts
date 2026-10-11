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
// Every copy of this module on a page shares these. A page can hold two: each
// importer's URL is stamped when the server serves it, so a list that changes
// between two of them gives each its own copy, and the one evaluated last takes
// over the hot update. Kept per copy, the handlers stayed with the other one, and
// the page applied every update to a list nobody was watching (#1237).
const shared = import.meta.hot
  ? (import.meta.hot.data.shared ??= { handlers: [], generation: -Infinity, files, tree })
  : { handlers: [], generation, files, tree }
if (generation > shared.generation) {
  const announce = shared.generation !== -Infinity
  Object.assign(shared, { generation, files, tree })
  if (announce) {
    shared.handlers.forEach(h => h(files, tree))
  }
}
export function onUpdate (cb) {
  shared.handlers.push(cb)
  // Registered through a copy the page has already moved past.
  if (shared.generation > generation) {
    cb(shared.files, shared.tree)
  }
}
if (import.meta.hot) {
  import.meta.hot.accept(newModule => {
    files = newModule.files
    tree = newModule.tree
    generation = newModule.generation
  })
}`
}
