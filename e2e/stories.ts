// Not a `.spec.ts`, so Playwright does not collect it as a test file.

/**
 * The stories every framework example is expected to carry, by id.
 *
 * Ids rather than paths: a path-derived id embeds the example's own directory
 * layout — `src-components-meow-story-vue` against `src-lib-meow-story-svelte` —
 * so a spec addressing one cannot address the others. An explicit id is the only
 * thing the four books can agree on, and it is what lets a single spec drive all
 * of them.
 *
 * `story-list.spec.ts` holds every book to this list, so a story added to one
 * framework and forgotten in another fails there rather than being noticed the
 * next time somebody opens the book.
 *
 * `vue3-tailwind` is not in this contract. It exists to test a consumer's own
 * Tailwind build against the chrome, not to be a fourth framework, and giving it
 * the full story set would only slow it down.
 */
export interface SharedStory {
  id: string
  /** As it reads in the sidebar, so a drifted title fails on the title. */
  title: string
}

export const SHARED_STORIES: SharedStory[] = [
  { id: 'conformance-button', title: 'Button' },
  { id: 'conformance-concurrent-state', title: 'Concurrent state' },
  { id: 'conformance-contrast', title: 'Contrast' },
  { id: 'conformance-controls', title: 'Control bindings' },
  { id: 'conformance-dark', title: 'Dark' },
  { id: 'conformance-docs', title: 'Documentation' },
  { id: 'conformance-events', title: 'Events' },
  { id: 'conformance-grid', title: 'Grid' },
  { id: 'conformance-huge-grid', title: 'Huge grid' },
  { id: 'conformance-inline-grid', title: 'Inline grid' },
  { id: 'conformance-markdown-links', title: 'Markdown links' },
  { id: 'conformance-no-iframe', title: 'No iframe' },
  { id: 'conformance-wrapper', title: 'Wrapper' },
]
