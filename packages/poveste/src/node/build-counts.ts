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

/**
 * What a finished build says it produced.
 *
 * A separate function because the interesting case is a claim rather than a
 * number: `✅ Built 0 stories (0 variants)` is true of a working build in a
 * project with nothing to build, and it is what a first-time reader gets from
 * the first command the guide tells them to run (#624). Nothing in it says
 * where the build looked, so there is no next step in it either.
 *
 * Not an error. A book with no stories is a valid thing to build — scaffolding
 * is exactly that state — so this changes what is said, not the exit code.
 *
 * Documents count as content: a book of `.story.md` pages with no variants has
 * something in it, and telling its author nothing was found would be wrong.
 */
export function buildSummary(counts: BuildCounts, seconds: number, storyMatch: string[]): string[] {
  const took = `in ${seconds}s`

  if (counts.stories === 0 && counts.docs === 0) {
    return [
      `Built 0 stories ${took} — nothing matched ${storyMatch.join(', ')}`,
      'Write a story file and run this again: https://poveste.dev/guide/',
    ]
  }

  const stories = `${counts.stories} stor${counts.stories === 1 ? 'y' : 'ies'}`
  const variants = `${counts.variants} variant${counts.variants === 1 ? '' : 's'}`
  const docs = counts.docs ? ` and ${counts.docs} document${counts.docs === 1 ? '' : 's'}` : ''

  return [`✅ Built ${stories} (${variants})${docs} ${took}`]
}
