import type { ServerStoryFile } from '@poveste/shared'
import type { ModuleGraph } from 'vite'

/** The story's own file, absolute. */
export function storyFileOf(storyFiles: ServerStoryFile[], storyId: string): string | undefined {
  return storyFiles.find(file => file.story?.id === storyId)?.path
}

/**
 * The files a story's own module imports, as collection resolved them: the
 * components that story names. Other story files are left out.
 */
export function componentsOfStory(storyFiles: ServerStoryFile[], moduleGraph: ModuleGraph, storyId: string): string[] {
  const storyPaths = new Set(storyFiles.map(file => file.path))
  const files = new Set<string>()
  for (const mod of moduleGraph.getModulesByFile(storyFileOf(storyFiles, storyId) ?? '') ?? []) {
    for (const imported of mod.importedModules) {
      if (imported.file && !storyPaths.has(imported.file)) {
        files.add(imported.file)
      }
    }
  }
  return [...files]
}
