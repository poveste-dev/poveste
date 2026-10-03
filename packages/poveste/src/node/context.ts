import type {
  ConfigMode,
  FinalSupportPlugin,
  PluginCommand,
  PovesteConfig,
  ServerMarkdownFile,
  ServerStoryFile,
} from '@poveste/shared'
import type { InlineConfig, ResolvedConfig } from 'vite'
import type { StoryDocsResult } from './docgen/protocol.js'
import { loadConfigFromFile as loadViteConfigFromFile, resolveConfig as resolveViteConfig } from 'vite'
import { processConfig, resolveConfig } from './config.js'
import { viteCommand, viteMode } from './util/vite-mode.js'
import { mergePovesteViteConfig, withoutIgnoredPlugins } from './vite.js'

export interface Context {
  root: string
  config: PovesteConfig
  resolvedViteConfig: ResolvedConfig
  mode: ConfigMode
  storyFiles: ServerStoryFile[]
  supportPlugins: FinalSupportPlugin[]
  markdownFiles: ServerMarkdownFile[]
  registeredCommands: PluginCommand[]
  /** What `poveste build` extracted for auto-docs, by story id (#1159). */
  componentDocs?: Record<string, StoryDocsResult['components']>
}

export interface CreateContextOptions {
  mode: Context['mode']
  configFile?: string | undefined
}

export async function createContext(options: CreateContextOptions): Promise<Context> {
  const config = await resolveConfig(process.cwd(), options.mode, options.configFile)
  const command = viteCommand(options.mode)
  // The mode as well as the command: `resolveConfig` defaults to
  // `'development'` whatever the command, and `base` from this resolution is
  // what the hand-written index.html uses while the bundle uses the build's.
  // A user config setting `base` by mode would otherwise disagree with itself.
  // Through `viteIgnorePlugins`, as the dev server and the build are: an ignored
  // plugin's `config` hook still runs in a resolution that skips it, and SvelteKit's
  // sets a relative `base` here, which index.html then carries (#1200).
  const userViteConfig = await loadViteConfigFromFile({ command, mode: viteMode(options.mode) })
  const viteConfig = await resolveViteConfig({
    ...userViteConfig?.config,
    configFile: false,
    plugins: await withoutIgnoredPlugins(userViteConfig?.config.plugins, config.viteIgnorePlugins),
  }, command, viteMode(options.mode))

  const supportPlugins = config.plugins.flatMap(p => p.supportPlugin ? [p.supportPlugin] : [])

  const partial = {
    root: viteConfig.root,
    config,
    mode: options.mode,
    storyFiles: [],
    supportPlugins,
    markdownFiles: [],
    registeredCommands: [],
  }

  const ctx: Context = {
    ...partial,
    // The user's `vite` overrides merged into the resolved config, as for an
    // inline one. Every resolved key survives the merge, so it is still read as
    // a resolved config.
    resolvedViteConfig: await mergePovesteViteConfig(viteConfig as unknown as InlineConfig, partial) as unknown as ResolvedConfig,
  }

  await processConfig(ctx)

  // List commands
  for (const plugin of ctx.config.plugins) {
    if (plugin.commands?.length) {
      ctx.registeredCommands.push(...plugin.commands)
    }
  }

  return ctx
}
