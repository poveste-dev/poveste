import type { Context } from '../context.js'
import { jsIdentifier, jsString } from './codegen.js'

export function resolvedConfig(ctx: Context) {
  let js = `export const config = ${JSON.stringify(ctx.config)}\n`
  if (ctx.config.theme?.logo) {
    for (const key in ctx.config.theme.logo) {
      js += `import Logo_${jsIdentifier(key, `theme.logo key '${key}'`)} from ${jsString(ctx.config.theme.logo[key])}\n`
    }
  }
  js += `export const logos = {${Object.keys(ctx.config.theme?.logo ?? {}).map(key => `${jsString(key)}: Logo_${key}`).join(', ')}}\n`
  return js
}
