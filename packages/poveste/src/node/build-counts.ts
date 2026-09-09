import type { ServerStoryFile } from '@poveste/shared'

export interface BuildCounts {
  /** Story files that produced a story with variants. */
  stories: number
  variants: number
  /** Standalone `.story.md` pages, which the book's home page calls Documents. */
  docs: number
  /** Relative paths of the files that produced neither, so the warning can name them. */
  empty: string[]
}

/**
 * Splits the collected story files three ways, the way the book's own home page
 * does: stories, documents, and files that produced nothing.
 *
 * "No variants" is not the question. A standalone `.story.md` is collected into a
 * story with `docsOnly: true` and `variants: []` by construction (`markdown.ts`),
 * so counting empty by variants alone reported every documentation page in the
 * book as a problem — three of the four `examples/vue3` warned about are
 * `SHARED_STORY_TITLES` entries that a required spec fails if you delete them,
 * which left the one real empty file hidden inside them (#670).
 *
 * Documents are counted rather than folded in with stories because `HomeView.vue`
 * already makes exactly this split, and a build that reports 60 stories over a
 * home page reading 57 Stories and 3 Documents disagrees with itself.
 */
export function buildCounts(storyFiles: ServerStoryFile[]): BuildCounts {
  const counts: BuildCounts = { stories: 0, variants: 0, docs: 0, empty: [] }

  for (const file of storyFiles) {
    if (file.story?.docsOnly) {
      counts.docs++
    }
    else if (file.story?.variants.length) {
      counts.stories++
      counts.variants += file.story.variants.length
    }
    else {
      counts.empty.push(file.relativePath)
    }
  }

  return counts
}
