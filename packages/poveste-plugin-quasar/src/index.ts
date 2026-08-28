import type { Plugin } from '@poveste/shared'

/**
 * Quasar builds its Vite config asynchronously and hands it over through one
 * entrypoint, whose own header says it is "used exclusively by @quasar/testing
 * AEs". That is the same footing as Tailwind's `__unstable__loadDesignSystem`:
 * usable, and not something to ask every user to import from their own config.
 */
export const QUASAR_APP_VITE_REQUIRED
  = '@poveste/plugin-quasar needs @quasar/app-vite: the installed copy does not export '
    + '`getTestingConfig` from `@quasar/app-vite/testing`. Install @quasar/app-vite@^3.8.0.'

/** What `getTestingConfig` hands back — a Vite config, loosely typed at this boundary. */
export interface QuasarViteConfig {
  define?: Record<string, unknown>
  resolve?: { alias?: unknown, extensions?: unknown, dedupe?: unknown }
  plugins?: unknown[]
}

export interface HstQuasarOptions {
  /**
   * Passed through to `getTestingConfig`. It resolves the SPA config whatever is
   * asked of it today, so this exists for when that stops being true.
   */
  ctx?: Record<string, unknown>
}

type GetTestingConfig = (ctx?: Record<string, unknown>) => Promise<QuasarViteConfig>

function hasGetTestingConfig(mod: unknown): mod is { getTestingConfig: GetTestingConfig } {
  return typeof (mod as { getTestingConfig?: unknown })?.getTestingConfig === 'function'
}

export async function resolveTestingConfig(
  importTesting: () => Promise<unknown> = () => import('@quasar/app-vite/testing'),
): Promise<GetTestingConfig> {
  let mod: unknown
  try {
    mod = await importTesting()
  }
  catch {
    throw new Error(QUASAR_APP_VITE_REQUIRED)
  }
  if (!hasGetTestingConfig(mod)) {
    throw new Error(QUASAR_APP_VITE_REQUIRED)
  }
  return mod.getTestingConfig
}

/**
 * Quasar's plugins are passed through whole. Nothing needs removing — unusually,
 * since the Nuxt plugin drops six — and removing its Vue plugin in particular
 * fails config resolution, because @quasar/vite-plugin asserts one precedes it.
 *
 * `ssr.noExternal` is the part users should not have to know: Quasar's plugin
 * writes `__QUASAR_VERSION__` while transforming its own source, so that source
 * has to be transformed rather than externalised during story collection.
 */
export function quasarViteConfig(viteConfig: QuasarViteConfig) {
  return {
    ssr: { noExternal: [/quasar/] },
    define: { ...viteConfig.define },
    resolve: {
      alias: viteConfig.resolve?.alias,
      extensions: viteConfig.resolve?.extensions,
      dedupe: viteConfig.resolve?.dedupe,
    },
    plugins: viteConfig.plugins,
  }
}

export function HstQuasar(options: HstQuasarOptions = {}): Plugin {
  return {
    name: '@poveste/plugin-quasar',

    async defaultConfig() {
      const getTestingConfig = await resolveTestingConfig()
      return { vite: quasarViteConfig(await getTestingConfig(options.ctx ?? {})) as never }
    },
  }
}
