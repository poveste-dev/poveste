import type { Story, Variant } from '@poveste/shared'
import type { App, Component } from 'vue'

export interface Vue3StorySetupApi {
  app: App
  story?: Story
  variant?: Variant
  addWrapper: (wrapper: Component) => void
}

export type Vue3StorySetupHandler = (api: Vue3StorySetupApi) => Promise<void> | void

export function defineSetupVue(handler: Vue3StorySetupHandler): Vue3StorySetupHandler {
  return handler
}

/**
 * @deprecated Renamed to {@link defineSetupVue}, and rename the exported hook
 * from `setupVue3` to `setupVue` at the same time. Both spellings work for the
 * whole of 0.x; the numbered pair is a candidate for removal at 1.0, which is
 * the only release allowed to drop them (#135).
 */
export const defineSetupVue3 = defineSetupVue
