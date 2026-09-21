import type { Context } from '../context.js'
import { parseColor } from '../colors.js'

export function resolvedTheme(ctx: Context) {
  let css = '*, ::before, ::after {'
  // Colors
  const colors: Record<string, Record<string, string | undefined> | undefined> = ctx.config.theme?.colors ?? {}
  for (const color in colors) {
    for (const key in colors[color]) {
      const value = colors[color][key]
      // Parsed to be rejected, not to be rebuilt. What goes into the variable is
      // what the config wrote: `parseColor` splits a colour into channels and
      // drops both the alpha and the space it was written in, so rebuilding from
      // its parts silently turned `#10b98180` opaque and `hsl(160 84% 39%)` into
      // `rgb(160 84% 39%)` — which is not a colour, so the declaration was thrown
      // away and the token fell back (#955).
      if (!parseColor(value)) {
        throw new Error(`[poveste] theme.colors.${color}.${key} is not a colour poveste can read: ${JSON.stringify(value)}`)
      }
      css += `--_poveste-color-${color}-${key}: ${value};`
    }
  }
  css += '}'
  return css
}
