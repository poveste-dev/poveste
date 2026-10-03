import type { ModuleGraph } from 'vite'
import type { Context } from '../context.js'
import type { StoryDocsResult } from './protocol.js'
import { componentsOfStory, storyFileOf } from './components-of.js'
import { createDocgenService } from './service.js'

/**
 * The build's pass (#1159): with no reader to wait for, every story's named
 * components are extracted once, after collection, into what the book ships.
 */
export async function extractComponentDocs(ctx: Context, moduleGraph: ModuleGraph): Promise<Record<string, StoryDocsResult['components']>> {
  const docgen = createDocgenService({
    root: ctx.root,
    plugins: ctx.config.plugins,
    enabled: ctx.config.autoDocs !== false,
    bookOptions: typeof ctx.config.autoDocs === 'object' ? ctx.config.autoDocs : undefined,
    collected: Promise.resolve(),
    storyFileOf: storyId => storyFileOf(ctx.storyFiles, storyId),
    componentsOf: storyId => componentsOfStory(ctx.storyFiles, moduleGraph, storyId),
  })
  if (!docgen.enabled) {
    return {}
  }
  const docs: Record<string, StoryDocsResult['components']> = {}
  try {
    for (const storyFile of ctx.storyFiles) {
      const storyId = storyFile.story?.id
      if (!storyId) {
        continue
      }
      const { components } = await docgen.request(storyId)
      if (Object.keys(components).length) {
        docs[storyId] = components
      }
    }
  }
  finally {
    await docgen.dispose()
  }
  return docs
}
