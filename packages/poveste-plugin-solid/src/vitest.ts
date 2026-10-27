import type { PovesteTestingPluginOptions } from 'poveste'
import { povesteTestingPlugin } from 'poveste'
import { SOLID_SETUP_HOOK_NAMES } from './index.js'

export type PovesteTestingOptions = Pick<PovesteTestingPluginOptions, 'configFile'>

/**
 * What a story needs in the user's own Vitest to render as `poveste dev` renders
 * it: the book's setup file and the modules Poveste's client imports, with Solid
 * and the vendored Vue its hosts run on pre-bundled for browser mode.
 */
export function povesteTesting(options: PovesteTestingOptions = {}): ReturnType<typeof povesteTestingPlugin> {
  return povesteTestingPlugin({
    ...options,
    setupHookNames: SOLID_SETUP_HOOK_NAMES,
    include: ['solid-js', 'solid-js/web', 'solid-js/store', '@poveste/vendors/vue'],
  })
}
