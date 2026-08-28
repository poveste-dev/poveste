import type { Plugin } from '@poveste/shared'
import { existsSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'
import process from 'node:process'

/**
 * Quasar builds its Vite config asynchronously and hands it over through one
 * entrypoint, whose own header says it is "used exclusively by @quasar/testing
 * AEs". That is the same footing as Tailwind's `__unstable__loadDesignSystem`:
 * usable, and not something to ask every user to import from their own config.
 */
export const QUASAR_PROJECT_REQUIRED
  = '@poveste/plugin-quasar found no quasar.config file above the current directory. '
    + 'It reads the Vite config Quasar builds for the project, so it needs a Quasar project to read.'

export const QUASAR_EXITED
  = '@poveste/plugin-quasar: Quasar ended the process while resolving its config. Its own output is above; '
    + 'a missing index.html or a quasar.config it refuses are the usual causes.'

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

/** Only these mean the package or its entrypoint is absent. Anything else is its own problem. */
const ABSENT = new Set(['ERR_MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'])

export function isPackageAbsent(error: unknown): boolean {
  return ABSENT.has((error as { code?: string })?.code ?? '')
}

export async function resolveTestingConfig(
  importTesting: () => Promise<unknown> = () => import('@quasar/app-vite/testing'),
): Promise<GetTestingConfig> {
  let mod: unknown
  try {
    mod = await importTesting()
  }
  catch (error) {
    // A broken transitive dependency, or a file the installed Node will not parse,
    // is not a missing package — saying so sends the reader to reinstall something
    // that was never the problem, and loses the error that was.
    if (!isPackageAbsent(error)) {
      throw error
    }
    throw new Error(QUASAR_APP_VITE_REQUIRED, { cause: error })
  }
  if (!hasGetTestingConfig(mod)) {
    throw new Error(QUASAR_APP_VITE_REQUIRED)
  }
  return mod.getTestingConfig
}

/** The directory holding the nearest quasar.config, searching upwards from `from`. */
export function findQuasarProject(from: string, exists: (path: string) => boolean = existsSync): string | undefined {
  const names = ['quasar.config.js', 'quasar.config.mjs', 'quasar.config.cjs', 'quasar.config.ts']
  let dir = from
  const { root } = parse(from)

  while (true) {
    if (names.some(name => exists(join(dir, name)))) {
      return dir
    }
    if (dir === root) {
      return undefined
    }
    dir = dirname(dir)
  }
}

/**
 * Quasar validates the project while building its config, and reports a failure by
 * calling its own `fatal()` — which ends in `process.exit(1)`. From inside a plugin
 * hook that takes the whole CLI down with it: no poveste error, no plugin named,
 * and `poveste dev` gone with it.
 *
 * Nothing here can stop a dependency exiting, so the exit is turned into a throw for
 * as long as the call lasts. The real `process.exit` goes back either way.
 */
export async function withoutProcessExit<T>(fn: () => Promise<T>): Promise<T> {
  const realExit = process.exit
  process.exit = ((code?: number) => {
    throw new Error(`${QUASAR_EXITED} (exit code ${code ?? 0})`)
  }) as typeof process.exit

  try {
    return await fn()
  }
  finally {
    process.exit = realExit
  }
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
      if (!findQuasarProject(process.cwd())) {
        throw new Error(QUASAR_PROJECT_REQUIRED)
      }
      const getTestingConfig = await resolveTestingConfig()
      const viteConfig = await withoutProcessExit(() => getTestingConfig(options.ctx ?? {}))
      return { vite: quasarViteConfig(viteConfig) as never }
    },
  }
}
