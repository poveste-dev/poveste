import type { PovesteTestingPluginOptions } from 'poveste'
import { povesteTestingPlugin } from 'poveste'
import { SVELTE_SETUP_HOOK_NAMES } from './setup-hooks.js'

export type PovesteTestingOptions = Pick<PovesteTestingPluginOptions, 'configFile'>

/**
 * What a story needs in the user's own Vitest to render as `poveste dev` renders
 * it: the book's setup file and the modules Poveste's client imports, with Svelte
 * and the vendored Vue its hosts run on pre-bundled for browser mode.
 */
export function povesteTesting(options: PovesteTestingOptions = {}): ReturnType<typeof povesteTestingPlugin> {
  return povesteTestingPlugin({
    ...options,
    setupHookNames: SVELTE_SETUP_HOOK_NAMES,
    include: ['svelte', 'svelte/internal/client', 'svelte/internal/disclose-version', 'svelte/store', '@poveste/vendors/vue', '@poveste/controls'],
  })
}
