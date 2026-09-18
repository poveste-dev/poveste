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
 * book as a problem — three of the four `examples/vue` warned about are
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
 * Whether the build produced anything a reader can open.
 *
 * Stated once because two callers ask it: the message below, and the colour
 * `build.ts` prints that message in. Reading it back off the message instead —
 * one line means green — ties the colour to the shape of an unrelated decision,
 * and a second success line would turn a good build yellow.
 */
export function builtSomething(counts: BuildCounts): boolean {
  return counts.stories > 0 || counts.docs > 0
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
 * Nothing built is two states, not one, and the likelier is the second: a
 * reader who followed the guide has a story file and has not put a `<Story>`
 * in it yet. Those files matched, so "nothing matched" is false of them, and
 * "write a story file" asks for the one they already wrote.
 *
 * Not an error. A book with no stories is a valid thing to build — scaffolding
 * is exactly that state — so this changes what is said, not the exit code.
 *
 * Documents count as content: a book of `.story.md` pages with no variants has
 * something in it, and telling its author nothing was found would be wrong.
 */
export function buildSummary(counts: BuildCounts, seconds: number, storyMatch: string[], guideUrl = 'https://poveste.dev/guide/getting-started'): string[] {
  const took = `in ${seconds}s`
  const globs = storyMatch.join(', ')

  if (!builtSomething(counts)) {
    if (counts.empty.length) {
      const files = `${counts.empty.length} file${counts.empty.length === 1 ? '' : 's'}`
      return [
        `Built 0 stories ${took} — ${files} matched ${globs} and produced no story`,
        `A story file needs a <Story> in it: ${guideUrl}`,
      ]
    }

    return [
      `Built 0 stories ${took} — nothing matched ${globs}`,
      `Write a story file and run this again: ${guideUrl}`,
    ]
  }

  const stories = `${counts.stories} stor${counts.stories === 1 ? 'y' : 'ies'}`
  const variants = `${counts.variants} variant${counts.variants === 1 ? '' : 's'}`
  const docs = counts.docs ? ` and ${counts.docs} document${counts.docs === 1 ? '' : 's'}` : ''

  return [`✅ Built ${stories} (${variants})${docs} ${took}`]
}

/**
 * The page that shows a story in the framework this book uses.
 *
 * The message used to send everyone to `/guide/`, which explains what a story is
 * for a second time rather than showing one — two hops of misdirection for a
 * reader who has just been told they have no stories (#905). Nuxt and Quasar
 * write Vue stories, SvelteKit writes Svelte ones, so the plugin names map onto
 * the two pages that exist.
 */
export function storyGuideUrl(pluginNames: string[]): string {
  const vue = ['@poveste/plugin-vue', '@poveste/plugin-nuxt', '@poveste/plugin-quasar']
  const svelte = ['@poveste/plugin-svelte']

  if (pluginNames.some(name => svelte.includes(name))) {
    return 'https://poveste.dev/guide/svelte/stories'
  }
  if (pluginNames.some(name => vue.includes(name))) {
    return 'https://poveste.dev/guide/vue/stories'
  }

  // A book with neither, such as vanilla: the framework list is the next step.
  return 'https://poveste.dev/guide/getting-started'
}
