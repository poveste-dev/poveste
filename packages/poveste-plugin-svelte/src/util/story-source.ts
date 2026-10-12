const RENDERS_A_STORY = '<Hst.Story'

/**
 * Whether a module is a Svelte story, by what it renders.
 *
 * Not by its name: `storyMatch` is the book's to narrow or replace, so
 * `src/stories/Button.svelte` is a story where the config says so, and a
 * `.story.svelte` pattern here does not follow it (#472, #474). Cheaper than a
 * parse, and one predicate for both Vite plugins that need to know.
 */
export function isSvelteStory(id: string, code: string): boolean {
  return id.replace(/\?.*$/s, '').endsWith('.svelte') && code.includes(RENDERS_A_STORY)
}
