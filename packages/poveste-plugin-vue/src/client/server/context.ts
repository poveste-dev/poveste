import type { ServerStory, ServerStoryFile, ServerVariant } from '@poveste/shared'
import { createContext } from '../context.js'

/*
 * Collect mode's contexts. The story one is deliberately not the app's: they
 * carry different shapes in different realms and shared one string key, so
 * nothing stopped one being injected where the other was expected (#981).
 */

/** The file being collected, provided by `run.ts` rather than by a component. */
export const storyFileContext = createContext<ServerStoryFile>('poveste-server-story-file', 'story file')

/** Optional: a `<Story>` collected outside a run has nowhere to report to. */
export const addStoryContext = createContext<(story: ServerStory) => void>('poveste-server-add-story', 'story file')

export const serverStoryContext = createContext<ServerStory>('poveste-server-story', '<Story>')

export const addVariantContext = createContext<(variant: ServerVariant) => void>('poveste-server-add-variant', '<Story>')
