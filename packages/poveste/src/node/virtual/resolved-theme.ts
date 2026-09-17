import type { Context } from '../context.js'
import { parseColor } from '../colors.js'

export function resolvedTheme(ctx: Context) {
  let css = '*, ::before, ::after {'
  // Colors
  const colors = ctx.config.theme?.colors ?? {}
  for (const color in colors) {
    for (const key in colors[color]) {
      const parsed = parseColor(colors[color][key])
      if (!parsed) {
        throw new Error(`[poveste] theme.colors.${color}.${key} is not a colour poveste can read: ${JSON.stringify(colors[color][key])}`)
      }
      css += `--_poveste-color-${color}-${key}: ${parsed.color.join(' ')};`
    }
  }
  css += '}'
  return css
}
