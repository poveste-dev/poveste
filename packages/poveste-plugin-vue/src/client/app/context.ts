import type { ComputedRef } from 'vue'
import { createContext } from '../context.js'

/*
 * App mode's contexts. Both are optional, and both were guarded by hand before
 * being able to say so (#981).
 */

/** The story a variant belongs to. Read with `?.` throughout. */
export const storyContext = createContext<ComputedRef<any>>('poveste-app-story', '<Story>')

/**
 * The story's implicit state, absent when the story has none. A variant skips
 * its state sync rather than failing, which is behaviour rather than an
 * oversight — this is the type saying so.
 */
export const implicitStateContext = createContext<() => any>('poveste-app-implicit-state', '<Story>')
