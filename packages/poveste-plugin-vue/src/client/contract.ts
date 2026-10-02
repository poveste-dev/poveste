import type { ClientSupportPlugin } from '@poveste/shared'
import type { Component } from 'vue'
import type * as client from './client.js'

// The app loads the client entry untyped at runtime, so it is held to the
// contract here, with this plugin's own `Component`: a plugin that drifts from
// it fails its own build (#1116). A separate file, so the check is not part of
// what the entry publishes.
type Satisfies<T extends ClientSupportPlugin<Component>> = T
export type ClientContract = Satisfies<typeof client>
