import type { Context } from '../context.js'

export const ID_SEPARATOR = '__-__'

/**
 * Names of every setup hook contributed by the enabled support plugins, e.g.
 * `setupVanilla`, `setupVue3`, `setupSvelte4`.
 */
export function getSetupFnNames(ctx: Context) {
  return [...new Set(ctx.supportPlugins.flatMap(p => p.setupFn))]
}

/**
 * Declares the setup hooks as named exports set to `undefined`.
 *
 * Consumers read them off a namespace import (`generatedSetup.setupVue3`) behind
 * a `typeof === 'function'` guard. Without the declaration Rollup can't resolve
 * the member access statically and warns `"setupVue3" is not exported by ...`
 * in every consumer build.
 */
export function declareEmptySetupFns(ctx: Context) {
  return getSetupFnNames(ctx).map(fnName => `export const ${fnName} = undefined`).join('\n')
}

export const PLUGINS_HAVE_DEV = [
  '@poveste/plugin-vue',
]
