import type { ServerStoryFile } from '@poveste/shared'
import type { ModuleGraph } from 'vite'

/** The story's own file, absolute, and the framework collection gave it. */
export function storyOf(storyFiles: ServerStoryFile[], storyId: string): { file: string, supportPluginId: string } | undefined {
  const storyFile = storyFiles.find(file => file.story?.id === storyId)
  return storyFile && { file: storyFile.path, supportPluginId: storyFile.supportPluginId }
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
