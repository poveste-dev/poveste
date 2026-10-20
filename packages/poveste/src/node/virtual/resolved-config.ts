import type { Context } from '../context.js'
import { jsIdentifier, jsString } from './codegen.js'

/**
 * The config as the browser gets it: the fields `@poveste/app` reads, and no
 * others. The rest is build-side, and holds paths on the machine that built the
 * book (`outDir`, each plugin's modules, the logo files), which a built book
 * published in full (#1383). The logos reach the browser as `logos`, below.
 */
export function clientConfig(config: Context['config']) {
  const theme = config.theme ?? {}
  return {
    theme: {
      title: theme.title,
      logoHref: theme.logoHref,
      defaultColorScheme: theme.defaultColorScheme,
      hideColorSchemeSwitch: theme.hideColorSchemeSwitch,
      storeColorScheme: theme.storeColorScheme,
      darkClass: theme.darkClass,
    },
    routerMode: config.routerMode,
    autoApplyContrastColor: config.autoApplyContrastColor,
    responsivePresets: config.responsivePresets,
    backgroundPresets: config.backgroundPresets,
    // eslint-disable-next-line ts/no-deprecated -- the app still reads it as a fallback
    defaultBackgroundColor: config.defaultBackgroundColor,
    preview: config.preview,
    isolateStyles: config.isolateStyles,
    // eslint-disable-next-line ts/no-deprecated -- the app still reads it as a fallback
    sandboxDarkClass: config.sandboxDarkClass,
  }
}

export function resolvedConfig(ctx: Context) {
  let js = `export const config = ${JSON.stringify(clientConfig(ctx.config))}\n`
  const logos = Object.entries(ctx.config.theme?.logo ?? {}).flatMap(([key, file]) => file === undefined ? [] : [[key, file] as const])
  for (const [key, file] of logos) {
    js += `import Logo_${jsIdentifier(key, `theme.logo key '${key}'`)} from ${jsString(file)}\n`
  }
  js += `export const logos = {${logos.map(([key]) => `${jsString(key)}: Logo_${key}`).join(', ')}}\n`
  return js
}
