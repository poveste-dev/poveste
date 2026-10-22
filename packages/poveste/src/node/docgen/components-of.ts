import type { ServerStory, ServerStoryFile } from '@poveste/shared'
import type { ViteDevServer } from 'vite'
import type { Resolve } from './reexports.js'
import { existsSync } from 'node:fs'
import { isAbsolute } from 'pathe'
import { storyComponents } from './reexports.js'

/** The story's own file, absolute, the framework collection gave it, and its own `autoDocs`. */
export function storyOf(storyFiles: ServerStoryFile[], storyId: string): { file: string, supportPluginId: string, autoDocs?: ServerStory['autoDocs'] } | undefined {
  const storyFile = storyFiles.find(file => file.story?.id === storyId)
  return storyFile && { file: storyFile.path, supportPluginId: storyFile.supportPluginId, autoDocs: storyFile.story?.autoDocs }
}

/** The components a story names, and how many capitalised imports reached none. */
export interface StoryComponents {
  files: string[]
  unresolved: number
}

/**
 * The files a story names: those its `component` field lists, when it has one; else
 * what its own module imports, as collection resolved it, and the components its
 * imports reach through re-exports (#1432). Other story files are left out.
 */
export async function componentsOfStory(storyFiles: ServerStoryFile[], server: Pick<ViteDevServer, 'moduleGraph' | 'pluginContainer'>, storyId: string): Promise<StoryComponents> {
  const storyFile = storyOf(storyFiles, storyId)?.file
  if (!storyFile) {
    return { files: [], unresolved: 0 }
  }
  const resolve: Resolve = async (specifier, importer) => {
    const id = (await server.pluginContainer.resolveId(specifier, importer, { ssr: true }))?.id.split('?')[0]
    return id && isAbsolute(id) && existsSync(id) ? id : undefined
  }
  const traced = await storyComponents(storyFile, resolve).catch(() => ({ files: [], named: false, unresolved: 0 }))
  if (traced.named) {
    return { files: traced.files, unresolved: traced.unresolved }
  }
  const storyPaths = new Set(storyFiles.map(file => file.path))
  const files = new Set(traced.files)
  for (const mod of server.moduleGraph.getModulesByFile(storyFile) ?? []) {
    for (const imported of mod.importedModules) {
      if (imported.file && !storyPaths.has(imported.file)) {
        files.add(imported.file)
      }
    }
  }
  return { files: [...files], unresolved: traced.unresolved }
}
