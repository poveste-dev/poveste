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

export interface SupportPlugin {
  id: string
  moduleName: string
  setupFn: string | string[]
  importStoriesPrepend?: string
  importStoryComponent: (file: ServerStoryFile, index: number) => string
}

export interface FinalSupportPlugin extends SupportPlugin {
  // For now, no additional properties
}

export interface ModuleLoader {
  clearCache: () => void
  loadModule: (file: string) => Promise<any>
  destroy: () => void
}

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

export interface PluginApiDev extends PluginApiBase {
  watcher: typeof chokidar
}

export type ChangeViteConfigCallback = (config: ViteInlineConfig) => Awaitable<void>
export type BuildEndCallback = () => Awaitable<void>
export type PreviewStoryCallback = (payload: { file: string, story: ServerStory, variant: ServerVariant, url: string }) => Awaitable<void>

export interface PluginApiBuild extends PluginApiBase {
  changeViteConfigCallbacks: ChangeViteConfigCallback[]
  buildEndCallbacks: BuildEndCallback[]
  previewStoryCallbacks: PreviewStoryCallback[]

  changeViteConfig: (cb: ChangeViteConfigCallback) => void
  onBuildEnd: (cb: BuildEndCallback) => void
  onPreviewStory: (cb: PreviewStoryCallback) => void
}

export interface PluginApiDevEvent extends PluginApiBase {
  event: string
  payload: any
}

export interface Plugin {
  /**
   * Name of the plugin
   */
  name: string
  /**
   * Modify histoire default config. The hook can either mutate the passed config or
   * return a partial config object that will be deeply merged into the existing
   * config. User config will have higher priority than default config.
   *
   * Note: User plugins are resolved before running this hook so injecting other
   * plugins inside  the `config` hook will have no effect.
   */
  defaultConfig?: (defaultConfig: PovesteConfig, mode: ConfigMode) => Partial<PovesteConfig> | null | void | Promise<Partial<PovesteConfig> | null | void>
  /**
   * Modify histoire config. The hook can either mutate the passed config or
   * return a partial config object that will be deeply merged into the existing
   * config.
   *
   * Note: User plugins are resolved before running this hook so injecting other
   * plugins inside  the `config` hook will have no effect.
   */
  config?: (config: PovesteConfig, mode: ConfigMode) => Partial<PovesteConfig> | null | void | Promise<Partial<PovesteConfig> | null | void>
  /**
   * Use this hook to read and store the final resolved histoire config.
   */
  configResolved?: (config: PovesteConfig) => Awaitable<void>
  /**
   * Use this hook to do processing during development. The `onCleanup` hook
   * should handle cleanup tasks when development server is closed.
   */
  onDev?: (api: PluginApiDev, onCleanup: (cb: () => Awaitable<void>) => void) => Awaitable<void>
  /**
   * Use this hook to do processing during production build.
   */
  /**
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
