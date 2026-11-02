import type { PovesteTestingPluginOptions } from 'poveste'
import { povesteTestingPlugin } from 'poveste'
import { REACT_SETUP_HOOK_NAMES } from './index.js'

export type PovesteTestingOptions = Pick<PovesteTestingPluginOptions, 'configFile'>

/**
 * What a story needs in the user's own Vitest to render as `poveste dev` renders
 * it: the book's setup file and the modules Poveste's client imports, with React
 * and the vendored Vue its hosts run on pre-bundled for browser mode.
 */
export function povesteTesting(options: PovesteTestingOptions = {}): ReturnType<typeof povesteTestingPlugin> {
  return povesteTestingPlugin({
    ...options,
    setupHookNames: REACT_SETUP_HOOK_NAMES,
    include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', '@poveste/vendors/vue'],
  })
}
