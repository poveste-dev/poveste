import type { Context } from '../context.js'
import { jsIdentifier, jsString } from './codegen.js'

export function resolvedConfig(ctx: Context) {
  let js = `export const config = ${JSON.stringify(ctx.config)}\n`
  const logos = Object.entries(ctx.config.theme?.logo ?? {}).flatMap(([key, file]) => file === undefined ? [] : [[key, file] as const])
  for (const [key, file] of logos) {
    js += `import Logo_${jsIdentifier(key, `theme.logo key '${key}'`)} from ${jsString(file)}\n`
  }
  js += `export const logos = {${logos.map(([key]) => `${jsString(key)}: Logo_${key}`).join(', ')}}\n`
  return js
}
