import type { Context } from '../context.js'
import { createRequire } from 'node:module'
import { jsString } from './codegen.js'
import { PLUGINS_HAVE_DEV } from './util.js'

const require = createRequire(import.meta.url)

export function resolvedSupportPluginsClient(ctx: Context) {
  const plugins = ctx.supportPlugins.map(p => `${jsString(p.id)}: () => import(${JSON.stringify(require.resolve(`${p.moduleName}/client${process.env.POVESTE_DEV && PLUGINS_HAVE_DEV.includes(p.moduleName) ? '-dev' : ''}`, {
    paths: [ctx.root, import.meta.url],
  }))})`)
  return `export const clientSupportPlugins = {
    ${plugins.join(',\n  ')}
  }`
}
