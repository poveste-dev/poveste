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

/**
 * Every story title all four framework examples must present.
 *
 * Titles rather than ids, because most of these stories do not set an id — the
 * list is about the book a reader opens, and that is what the sidebar shows.
 * `SHARED_STORIES` above is the smaller set that specs address by id.
 *
 * An example is free to carry more: `Nuxt/…`, `SvelteKit/…` and the Svelte
 * regression fixtures are framework-specific by nature. What it may not do is
 * carry fewer, which is how vue3 ended up as the only book exercising the
 * chrome.
 *
 * Five of vue3's stories are still absent, and four of them wait on the plugin:
 * `Auto State & Props` needs auto-props (#233), the two `WrapperMetaOn…` stories
 * need `addWrapper` (#232), and `Story setup` needs setup hooks that run before
 * the story mounts and an app to register things on (#234). `Tailwind` is the
 * odd one out — it is generated from design-system config rather than being a
 * story file at all. They go in here as they land.
 */
export const SHARED_STORY_TITLES: string[] = [
  'BaseButton',
  'Button',
  'Code gen',
  'Color Button',
  'ComplexParameter',
  'Concurrent state',
  'Contrast',
  'ContrastColor',
  'Control bindings',
  'Controls',
  'Dark',
  'Dark mode',
  'Demo',
  'Docs',
  'Documentation',
  'EventButton',
  'EventButtonGrid',
  'Events',
  'Grid',
  'Hand-written source',
  'Huge grid',
  'HugeGrid',
  'Inline grid',
  'InlineGrid',
  'Introduction',
  'LongFile1',
  'LongFile2',
  'LottieAnimation',
  'Markdown links',
  'MarkdownFile',
  'MarkdownLinks',
  'NestedButton',
  'No iframe',
  'No variant tag',
  'Popover theming',
  'Responsive',
  'Serialize',
  'Shared Controls',
  'State',
  'State key removal',
  'StateOption',
  'StateSetup',
  'StateSetup2',
  'Store',
  'StoryOptions Override',
  'Sub Story 1',
  'Sub Story 2',
  'With sass',
  'Wrapper',
  '🐱 Meow',
]
