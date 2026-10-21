import type { ViteDevServer } from 'vite'
import type { Context } from '../context.js'
import type { StoryDocsResult } from './protocol.js'
import { componentsOfStory, storyOf } from './components-of.js'
import { createDocgenService } from './service.js'

/**
 * The build's pass (#1159): with no reader to wait for, every story's named
 * components are extracted once, after collection, into what the book ships.
 */
export async function extractComponentDocs(ctx: Context, server: Pick<ViteDevServer, 'moduleGraph' | 'pluginContainer'>): Promise<Record<string, StoryDocsResult['components']>> {
  const docgen = createDocgenService({
    root: ctx.root,
    plugins: ctx.config.plugins,
    enabled: ctx.config.autoDocs !== false,
    bookOptions: typeof ctx.config.autoDocs === 'object' ? ctx.config.autoDocs : undefined,
    collected: Promise.resolve(),
    storyOf: storyId => storyOf(ctx.storyFiles, storyId),
    componentsOf: storyId => componentsOfStory(ctx.storyFiles, server, storyId),
  })
  if (!docgen.enabled) {
    return {}
  }
  const docs: Record<string, StoryDocsResult['components']> = {}
  const failed = new Map<string, string>()
  try {
    for (const storyFile of ctx.storyFiles) {
      const storyId = storyFile.story?.id
      if (!storyId) {
        continue
      }
      const { components } = await docgen.request(storyId)
      // A built book is published, so an extractor's error stays on the build
      // machine: the component keeps its runtime props, as with auto-docs off (#1382).
      // A result with neither is a file with nothing to document, such as a JSX
      // story that names no component, and is not a failure.
      const read = Object.entries(components).filter(([file, result]) => {
        if (!result.doc && result.error !== undefined) {
          failed.set(file, result.error)
        }
        return result.doc
      })
      if (read.length) {
        docs[storyId] = Object.fromEntries(read)
      }
    }
  }
  finally {
    await docgen.dispose()
  }
  if (failed.size) {
    const [file, error] = [...failed][0]!
    console.warn(`[poveste] auto-docs could not read ${failed.size} component${failed.size === 1 ? '' : 's'}, which show their runtime props instead. The first, ${file}: ${error}`)
  }
  return docs
}
