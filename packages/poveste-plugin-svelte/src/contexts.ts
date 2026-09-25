import type { ServerStory, ServerStoryFile, ServerVariant, Story, Variant } from '@poveste/shared'
import { createContext } from './context.js'

/*
 * Every context this plugin passes, in one place (#981). Collect mode and the
 * render path are separate keys even where they carry a story each, because
 * they carry different shapes — the same mistake `plugin-vue` made with one
 * string used in two realms.
 */

/** Collect mode: the file being collected, seeded by `collect/index.ts`. */
export const storyFileContext = createContext<ServerStoryFile>('poveste-svelte-story-file', 'story file')

/** Collect mode, optional: a `<Story>` collected outside a run has nowhere to report to. */
export const addStoryContext = createContext<(story: ServerStory) => void>('poveste-svelte-add-story', 'story file')

/** Collect mode: what `<Variant>` reports itself to. */
export const collectStoryContext = createContext<ServerStory>('poveste-svelte-collect-story', '<Story>')
export const addVariantContext = createContext<(variant: ServerVariant) => void>('poveste-svelte-add-variant', '<Story>')

/* The render path. */
export const storyContext = createContext<Story>('poveste-svelte-story', '<Story>')
export const variantContext = createContext<Variant>('poveste-svelte-variant', '<Variant>')
export const slotNameContext = createContext<string>('poveste-svelte-slot', '<Story>')
export const slotsContext = createContext<Record<string, any>>('poveste-svelte-slots', '<Story>')
export const storyPropsContext = createContext<Record<string, any>>('poveste-svelte-story-props', '<Story>')
export const variantIndexContext = createContext<{ value: number }>('poveste-svelte-variant-index', '<Story>')
export const targetVariantIdContext = createContext<string | null>('poveste-svelte-target-variant-id', '<Story>')
