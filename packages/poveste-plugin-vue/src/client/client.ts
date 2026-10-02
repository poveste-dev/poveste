import type { ClientSupportPlugin } from '@poveste/shared'
import type * as self from './client.js'

export * from './app/index.js'
export * from './codegen.js'

declare module '@poveste/shared' {
  interface StoryMeta {
    hasVariantChildComponents?: boolean
  }
}

// The app loads this module untyped at runtime, so it is held to the contract
// here: a plugin that drifts from it fails its own build (#1116).
type Satisfies<T extends ClientSupportPlugin> = T
export type ClientContract = Satisfies<typeof self>
