import type { PovesteConfig } from './types/config.js'

/**
 * The virtual modules Poveste's client imports, by the ids core serves them
 * under. A story test's Vite plugin serves the same ones, from this list.
 */
export const VIRTUAL_IDS = {
  setup: 'virtual:$poveste-setup',
  generatedGlobalSetup: 'virtual:$poveste-generated-global-setup',
  config: 'virtual:$poveste-config',
  markdownFiles: 'virtual:$poveste-markdown-files',
  componentDocs: 'virtual:$poveste-component-docs',
  supportPluginsClient: 'virtual:$poveste-support-plugins-client',
} as const

/**
 * The config as the browser gets it: the fields `@poveste/app` reads, and no
 * others. The rest is build-side, and holds paths on the machine that built the
 * book (`outDir`, each plugin's modules, the logo files), which a built book
 * published in full (#1383). The logos reach the browser as `logos`, below.
 */
export function clientConfig(config: Partial<PovesteConfig>) {
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
