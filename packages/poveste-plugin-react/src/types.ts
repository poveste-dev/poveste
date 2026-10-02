import type { Awaitable, Story, StoryProps, Variant, VariantProps } from '@poveste/shared'
import type { ComponentType, ReactNode } from 'react'

// The same story format as `@poveste/plugin-solid`: a default-exported object of
// data, with three answers of React's own — what `render` returns, what
// `setState` takes, and what a wrapper is. What differs is when `render` runs.
// It is a component body: React calls it again on every state change, with
// `state` a fresh snapshot each time, so hooks work inside it as they would in
// any component.

export interface ReactRenderApi<S extends object> {
  /** This render's snapshot. Never mutate it; call `setState`. */
  state: S
  /**
   * Merges into the state, as a class component's `setState` does: pass the
   * keys that change, or a function of the current state. Changes also reach
   * the controls panel and the host.
   */
  setState: (next: Partial<S> | ((state: S) => Partial<S>)) => void
}

export interface ReactStorySetupApi {
  story: Story
  variant: Variant
  /**
   * Wraps every story this hook runs for. The first added is the outermost,
   * as in `@poveste/plugin-vue`.
   */
  addWrapper: (wrapper: ReactWrapper) => void
}

export type ReactWrapper = ComponentType<{ story: Story, variant: Variant, children: ReactNode }>

export type ReactStorySetupHandler = (api: ReactStorySetupApi) => Awaitable<void>

export interface VariantOptions<S extends object = Record<string, any>> extends Omit<VariantProps, 'setupApp'> {
  /** A component body: called on every render, so hooks are allowed. */
  render: (api: ReactRenderApi<S>) => ReactNode
  initState?: () => Awaitable<S>
  setupApp?: ReactStorySetupHandler
}

export interface StoryOptions<S extends object = Record<string, any>> extends Omit<StoryProps, 'setupApp'> {
  /** A story with no `variants` and a `render` of its own has one implicit variant. */
  variants?: VariantOptions<S>[]
  render?: (api: ReactRenderApi<S>) => ReactNode
  initState?: () => Awaitable<S>
  setupApp?: ReactStorySetupHandler
}

export function defineStory<S extends object = Record<string, any>>(story: StoryOptions<S>): StoryOptions<S> {
  return story
}

export function defineSetupReact(handler: ReactStorySetupHandler): ReactStorySetupHandler {
  return handler
}

/** The variants a story declares, with the implicit one made explicit. */
export function variantOptions(story: StoryOptions<any>): VariantOptions<any>[] {
  if (story.variants?.length) {
    return story.variants
  }
  return story.render ? [{ id: '_default', title: 'default', render: story.render }] : []
}
