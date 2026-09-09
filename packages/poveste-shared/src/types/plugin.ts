import type chokidar from 'chokidar'
import type fs from 'fs-extra'
import type path from 'pathe'
import type pc from 'picocolors'
import type { InlineConfig as ViteInlineConfig, Plugin as VitePlugin } from 'vite'
import type { Awaitable } from '../type-utils.js'
import type {
  PluginCommand,
} from './command.js'
import type {
  ConfigMode,
  PovesteConfig,
} from './config.js'
import type {
  ServerStory,
  ServerStoryFile,
  ServerVariant,
} from './story.js'

/**
 * A framework's collection strategy: how a story file written for that framework
 * is imported and mounted. `@poveste/plugin-vue` and `@poveste/plugin-svelte`
 * each expose one, and `supportMatch` in the config decides which files it claims.
 */
export interface SupportPlugin {
  id: string
  moduleName: string
  setupFn: string | string[]
  importStoriesPrepend?: string
  importStoryComponent: (file: ServerStoryFile, index: number) => string
}

/**
 * A {@link SupportPlugin} after Poveste has resolved it. Identical to the
 * declared shape today; it exists so resolution can add fields without changing
 * what a plugin author writes.
 */
export interface FinalSupportPlugin extends SupportPlugin {
  // For now, no additional properties
}

/**
 * Loads a module through Vite, so a plugin can read a user's `.ts` or `.vue`
 * file the way the collector does rather than reaching for `import`.
 *
 * `loadModule` resolves to `undefined` on an error it has already logged, so a
 * caller that needs to fail has to check the result. `clearCache` invalidates
 * Vite's module graph as well as the runner's, which is what makes a re-read
 * after a file change return the new contents.
 */
export interface ModuleLoader {
  clearCache: () => void
  loadModule: (file: string) => Promise<any>
  destroy: () => void
}

/**
 * What every plugin hook receives. `colors`, `path` and `fs` are Poveste's own
 * picocolors, pathe and fs-extra, handed over so a plugin can use them without
 * adding a second copy to the tree.
 *
 * Prefer `log`/`warn`/`error` over `console`: they prefix the plugin's name, so
 * a line in a busy build says what printed it.
 */
export interface PluginApiBase {
  colors: typeof pc
  path: typeof path
  fs: typeof fs
  moduleLoader: ModuleLoader

  readonly pluginTempDir: string

  log: (...msg) => void
  warn: (...msg) => void
  error: (...msg) => void

  getStories: () => ServerStory[]
  addStoryFile: (file: string) => void

  getConfig: () => PovesteConfig
}

/**
 * {@link PluginApiBase} plus the file watcher, passed to `onDev`. Only the dev
 * server has one — a build never watches.
 */
export interface PluginApiDev extends PluginApiBase {
  watcher: typeof chokidar
}

/**
 * Mutates the Vite config Poveste is about to build with. Registered through
 * `changeViteConfig`, and run once, before the build starts.
 */
export type ChangeViteConfigCallback = (config: ViteInlineConfig) => Awaitable<void>
/**
 * Runs after a build **succeeds**. A build that fails never reaches it, which is
 * why anything that must be released belongs in `onCleanup` instead (#434).
 */
export type BuildEndCallback = () => Awaitable<void>
/**
 * Runs once per variant **after** the build has finished, against a preview
 * server started for the purpose, with the URL that variant is served from.
 * This is the hook a screenshot or visual-diff plugin uses.
 *
 * Registering one is what makes the build start that server at all, so a plugin
 * that registers unconditionally adds a preview boot to every build.
 */
export type PreviewStoryCallback = (payload: { file: string, story: ServerStory, variant: ServerVariant, url: string }) => Awaitable<void>

/**
 * {@link PluginApiBase} plus the build hooks, passed to `onBuild`. The three
 * arrays are the registered callbacks; the three functions are how a plugin adds
 * to them.
 */
export interface PluginApiBuild extends PluginApiBase {
  changeViteConfigCallbacks: ChangeViteConfigCallback[]
  buildEndCallbacks: BuildEndCallback[]
  previewStoryCallbacks: PreviewStoryCallback[]

  changeViteConfig: (cb: ChangeViteConfigCallback) => void
  onBuildEnd: (cb: BuildEndCallback) => void
  onPreviewStory: (cb: PreviewStoryCallback) => void
}

/**
 * {@link PluginApiBase} plus the event that triggered the hook, passed to
 * `onDevEvent`. `payload` is whatever the client sent to `sendEvent`, unvalidated.
 */
export interface PluginApiDevEvent extends PluginApiBase {
  event: string
  payload: any
}

/**
 * A Poveste plugin: a name and whichever hooks it needs. Listed in `plugins` in
 * `poveste.config.ts`, and every hook is optional.
 *
 * The hooks below run in the order they are declared — `defaultConfig`, `config`
 * and `configResolved` while the config settles, then `onDev`, `onBuild` or
 * `onPreview` depending on the command.
 */
export interface Plugin {
  /**
   * Name of the plugin
   */
  name: string
  /**
   * Modify Poveste's default config. The hook can either mutate the passed config or
   * return a partial config object that will be deeply merged into the existing
   * config. User config will have higher priority than default config.
   *
   * Note: User plugins are resolved before running this hook so injecting other
   * plugins inside  the `config` hook will have no effect.
   */
  defaultConfig?: (defaultConfig: PovesteConfig, mode: ConfigMode) => Partial<PovesteConfig> | null | void | Promise<Partial<PovesteConfig> | null | void>
  /**
   * Modify the Poveste config. The hook can either mutate the passed config or
   * return a partial config object that will be deeply merged into the existing
   * config.
   *
   * Note: User plugins are resolved before running this hook so injecting other
   * plugins inside  the `config` hook will have no effect.
   */
  config?: (config: PovesteConfig, mode: ConfigMode) => Partial<PovesteConfig> | null | void | Promise<Partial<PovesteConfig> | null | void>
  /**
   * Use this hook to read and store the final resolved Poveste config.
   */
  configResolved?: (config: PovesteConfig) => Awaitable<void>
  /**
   * Use this hook to do processing during development. The `onCleanup` hook
   * should handle cleanup tasks when development server is closed.
   */
  onDev?: (api: PluginApiDev, onCleanup: (cb: () => Awaitable<void>) => void) => Awaitable<void>
  /**
   * Use this hook to do processing during production build.
   *
   * `onCleanup` runs however the build ends, including when it fails. Anything a
   * plugin opened belongs there rather than in `onBuildEnd`, which only runs when
   * the build succeeded — a plugin holding a framework instance or a watcher kept
   * a failed build's process alive on that difference (#434).
   */
  onBuild?: (api: PluginApiBuild, onCleanup: (cb: () => Awaitable<void>) => void) => Awaitable<void>
  /**
   * Use this hook to do processing when preview is started.
   */
  onPreview?: () => Awaitable<void>
  /**
   * This plugin exposes a support plugin (example: Vue, Svelte, etc.)
   */
  supportPlugin?: SupportPlugin
  /**
   * This plugin exposes commands that can be executed from the search bar in development mode.
   */
  commands?: PluginCommand[]
  /**
   * Handle a custom event from the client in development mode.
   */
  onDevEvent?: (api: PluginApiDevEvent) => Awaitable<any>
  /**
   * Use this hook to manipulate Vite plugins before they are passed to Vite.
   */
  vitePlugins?: (plugins: VitePlugin[]) => Awaitable<void>
}
