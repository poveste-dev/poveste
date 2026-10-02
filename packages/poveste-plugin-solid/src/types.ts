import type { Awaitable, Story, StoryProps, Variant, VariantProps } from '@poveste/shared'
import type { Component, JSX } from 'solid-js'
import type { SetStoreFunction } from 'solid-js/store'

// The story format is data — a default-exported object, as `vanilla-support`'s is
// — rather than components the way Vue and Svelte stories are. Nothing in the
// shape below is Solid's except what `render` returns, what `setState` accepts,
// and what a wrapper is, so a React plugin can take the same shape with its own
// three answers. What *is* Solid's is when `render` runs: once, with `state` a
// store whose reads are tracked, so a change reaches the DOM without calling it
// again.

export interface SolidRenderApi<S extends object> {
  /** A Solid store. Read it inside JSX and the read is tracked. */
  state: S
  /** The store's setter. Changes also reach the controls panel and the host. */
  setState: SetStoreFunction<S>
}

export interface SolidStorySetupApi {
  story: Story
  variant: Variant
  /**
   * Wraps every story this hook runs for. The first added is the outermost,
   * as in `@poveste/plugin-vue`.
   */
  addWrapper: (wrapper: SolidWrapper) => void
}

export type SolidWrapper = Component<{ story: Story, variant: Variant, children: JSX.Element }>

export type SolidStorySetupHandler = (api: SolidStorySetupApi) => Awaitable<void>

export interface VariantOptions<S extends object = Record<string, any>> extends Omit<VariantProps, 'setupApp'> {
  /** Called once per mount. */
  render: (api: SolidRenderApi<S>) => JSX.Element
  initState?: () => Awaitable<S>
  setupApp?: SolidStorySetupHandler
}

export interface StoryOptions<S extends object = Record<string, any>> extends Omit<StoryProps, 'setupApp'> {
  /** A story with no `variants` and a `render` of its own has one implicit variant. */
  variants?: VariantOptions<S>[]
  render?: (api: SolidRenderApi<S>) => JSX.Element
  initState?: () => Awaitable<S>
  setupApp?: SolidStorySetupHandler
}

export function defineStory<S extends object = Record<string, any>>(story: StoryOptions<S>): StoryOptions<S> {
  return story
}

export function defineSetupSolid(handler: SolidStorySetupHandler): SolidStorySetupHandler {
  return handler
}

/** The variants a story declares, with the implicit one made explicit. */
export function variantOptions(story: StoryOptions<any>): VariantOptions<any>[] {
  if (story.variants?.length) {
    return story.variants
  }
  return story.render ? [{ id: '_default', title: 'default', render: story.render }] : []
}
