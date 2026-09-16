import type {
  BuildEndCallback,
  ChangeViteConfigCallback,
  ModuleLoader,
  Plugin,
  PluginApiBase,
  PluginApiBuild,
  PluginApiDev,
  PluginApiDevEvent,
  PovesteConfig,
  PreviewStoryCallback,
  ServerStory,
} from '@poveste/shared'
import type { Context } from './context.js'
import chokidar from 'chokidar'
import fs from 'fs-extra'
import path from 'pathe'
import pc from 'picocolors'
import { TEMP_PATH } from './alias.js'
import { addStory, removeStory } from './stories.js'

export class BasePluginApi implements PluginApiBase {
  colors = pc
  path = path
  fs = fs

  constructor(
    protected ctx: Context,
    protected plugin: Plugin,
    public moduleLoader: ModuleLoader,
  ) { }

  get pluginTempDir() {
    return path.resolve(TEMP_PATH, 'plugins', this.plugin.name.replace(/:/g, '_'))
  }

  log(...msg: unknown[]) {
    console.log(this.colors.gray(`[Plugin:${this.plugin.name}]`), ...msg)
  }

  warn(...msg: unknown[]) {
    console.warn(this.colors.yellow(`[Plugin:${this.plugin.name}]`), ...msg)
  }

  error(...msg: unknown[]) {
    console.error(this.colors.red(`[Plugin:${this.plugin.name}]`), ...msg)
  }

  addStoryFile(file: string) {
    removeStory(file)
    addStory(file)
  }

  getStories(): ServerStory[] {
    return this.ctx.storyFiles.flatMap(f => f.story ? [f.story] : [])
  }

  getConfig(): PovesteConfig {
    return this.ctx.config
  }
}

export class DevPluginApi extends BasePluginApi implements PluginApiDev {
  watcher = chokidar
}

export class BuildPluginApi extends BasePluginApi implements PluginApiBuild {
  changeViteConfigCallbacks: ChangeViteConfigCallback[] = []
  buildEndCallbacks: BuildEndCallback[] = []
  previewStoryCallbacks: PreviewStoryCallback[] = []

  changeViteConfig(cb: ChangeViteConfigCallback) {
    this.changeViteConfigCallbacks.push(cb)
  }

  onBuildEnd(cb: BuildEndCallback) {
    this.buildEndCallbacks.push(cb)
  }

  onPreviewStory(cb: PreviewStoryCallback) {
    this.previewStoryCallbacks.push(cb)
  }
}

export class DevEventPluginApi extends BasePluginApi implements PluginApiDevEvent {
  constructor(
    ctx: Context,
    plugin: Plugin,
    moduleLoader: ModuleLoader,
    public event: string,
    public payload: any,
  ) {
    super(ctx, plugin, moduleLoader)
  }
}
