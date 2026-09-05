import type {
  ConfigMode,
  FinalSupportPlugin,
  PluginCommand,
  PovesteConfig,
  ServerMarkdownFile,
  ServerStoryFile,
} from '@poveste/shared'
import type { ResolvedConfig } from 'vite'
import { resolveConfig as resolveViteConfig } from 'vite'
import { processConfig, resolveConfig } from './config.js'
import { viteCommand, viteMode } from './util/vite-mode.js'
import { mergePovesteViteConfig } from './vite.js'

export interface Context {
  root: string
  config: PovesteConfig
  resolvedViteConfig: ResolvedConfig
  mode: ConfigMode
  storyFiles: ServerStoryFile[]
  supportPlugins: FinalSupportPlugin[]
  markdownFiles: ServerMarkdownFile[]
  registeredCommands?: PluginCommand[]
}

export interface CreateContextOptions {
  mode: Context['mode']
  configFile?: string
}

export async function createContext(options: CreateContextOptions): Promise<Context> {
  const config = await resolveConfig(process.cwd(), options.mode, options.configFile)
  const command = viteCommand(options.mode)
  // The mode as well as the command: `resolveConfig` defaults to
  // `'development'` whatever the command, and `base` from this resolution is
  // what the hand-written index.html uses while the bundle uses the build's.
  // A user config setting `base` by mode would otherwise disagree with itself.
  const viteConfig = await resolveViteConfig({}, command, viteMode(options.mode))

  const supportPlugins = config.plugins.map(p => p.supportPlugin).filter(Boolean)

  const ctx = {
    root: viteConfig.root,
    config,
    resolvedViteConfig: null,
    mode: options.mode,
    storyFiles: [],
    supportPlugins,
    markdownFiles: [],
    registeredCommands: [],
  }

  ctx.resolvedViteConfig = await mergePovesteViteConfig(viteConfig as unknown, ctx)

  await processConfig(ctx)

  // List commands
  for (const plugin of ctx.config.plugins) {
    if (plugin.commands?.length) {
      ctx.registeredCommands.push(...plugin.commands)
    }
  }

  return ctx
}
