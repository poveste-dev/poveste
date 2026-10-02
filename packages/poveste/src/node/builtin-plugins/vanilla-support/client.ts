import type { ClientSupportPlugin } from '@poveste/shared'
import type * as self from './client'

export { default as MountStory } from './MountStory'
export { default as RenderStory } from './RenderStory'

export function generateSourceCode(): undefined {
  // noop
}

// The app loads this module untyped at runtime, so it is held to the contract
// here: a plugin that drifts from it fails its own build (#1116).
type Satisfies<T extends ClientSupportPlugin> = T
export type ClientContract = Satisfies<typeof self>
