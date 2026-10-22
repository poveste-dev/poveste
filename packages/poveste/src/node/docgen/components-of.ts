import type { ServerStory, ServerStoryFile } from '@poveste/shared'
import type { ModuleGraph } from 'vite'

/** The story's own file, absolute, the framework collection gave it, and its own `autoDocs`. */
export function storyOf(storyFiles: ServerStoryFile[], storyId: string): { file: string, supportPluginId: string, autoDocs?: ServerStory['autoDocs'] } | undefined {
  const storyFile = storyFiles.find(file => file.story?.id === storyId)
  return storyFile && { file: storyFile.path, supportPluginId: storyFile.supportPluginId, autoDocs: storyFile.story?.autoDocs }
}

/**
 * The files a story's own module imports, as collection resolved them: the
 * components that story names. Other story files are left out.
 */
export function componentsOfStory(storyFiles: ServerStoryFile[], moduleGraph: ModuleGraph, storyId: string): string[] {
  const storyPaths = new Set(storyFiles.map(file => file.path))
  const files = new Set<string>()
  for (const mod of moduleGraph.getModulesByFile(storyOf(storyFiles, storyId)?.file ?? '') ?? []) {
    for (const imported of mod.importedModules) {
      if (imported.file && !storyPaths.has(imported.file)) {
        files.add(imported.file)
      }
    }
  }
  return [...files]
}
