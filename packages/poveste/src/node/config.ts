import type {
  ConfigMode,
  Plugin,
  PovesteConfig,
  SupportMatchPattern,
} from '@poveste/shared'
import type { Context } from './context.js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createDefu } from 'defu'
import { createJiti } from 'jiti'
import path from 'pathe'
import pc from 'picocolors'
import {
  mergeConfig as mergeViteConfig,
  resolveConfig as resolveViteConfig,
} from 'vite'
import { vanillaSupport } from './builtin-plugins/vanilla-support/plugin.js'
import { defaultColors } from './colors.js'
import { findUp } from './util/find-up.js'

const __filename = fileURLToPath(import.meta.url)

export function getDefaultConfig(): PovesteConfig {
  return {
    plugins: [
      vanillaSupport(),
    ],
    outDir: '.poveste/dist',
    storyMatch: [
      '**/*.story.vue',
      '**/*.story.svelte',
    ],
    storyIgnored: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    supportMatch: [],
    isolateStyles: true,
    tree: {
      file: 'title',
      order: 'asc',
    },
    theme: {
      title: 'Poveste',
      colors: {
        primary: defaultColors.emerald,
        gray: defaultColors.zinc,
      },
      defaultColorScheme: 'auto',
      storeColorScheme: true,
      darkClass: 'dark',
      lang: 'en',
    },
    responsivePresets: [
      {
        label: 'Mobile (Small)',
        width: 320,
        height: 560,
      },
      {
        label: 'Mobile (Medium)',
        width: 360,
        height: 640,
      },
      {
        label: 'Mobile (Large)',
        width: 414,
        height: 896,
      },
      {
        label: 'Tablet',
        width: 768,
        height: 1024,
      },
      {
        label: 'Laptop (Small)',
        width: 1024,
        height: null,
      },
      {
        label: 'Laptop (Large)',
        width: 1366,
        height: null,
      },
      {
        label: 'Desktop',
        width: 1920,
        height: null,
      },
      {
        label: '4K',
        width: 3840,
        height: null,
      },
    ],
    backgroundPresets: [
      {
        label: 'Transparent',
        color: 'transparent',
        contrastColor: '#333',
      },
      {
        label: 'White',
        color: '#fff',
        contrastColor: '#333',
      },
      {
        label: 'Light gray',
        color: '#aaa',
        contrastColor: '#000',
      },
      {
        label: 'Dark gray',
        color: '#333',
        contrastColor: '#fff',
      },
      {
        label: 'Black',
        color: '#000',
        contrastColor: '#eee',
      },
    ],
    routerMode: 'history',
    build: {
      excludeFromVendorsChunk: [],
    },
    vite: (config) => {
      // Remove vite:legacy plugins https://github.com/histoire-dev/histoire/issues/156
      const index = config.plugins?.findIndex(plugin => Array.isArray(plugin)
        && typeof plugin[0] === 'object'
        && !Array.isArray(plugin[0])
        // @ts-expect-error could have no property 'name'
        && plugin[0].name?.startsWith('vite:legacy'))
      if (index !== -1) {
        config.plugins?.splice(index, 1)
      }

      return {
        build: {
          lib: false,
        },
      }
    },
    viteIgnorePlugins: [],
  }
}

export const configFileNames = [
  'poveste.config.ts',
  'poveste.config.js',
  '.poveste.ts',
  '.poveste.js',
  // Back-compat with histoire — existing projects keep working as a drop-in.
  'histoire.config.ts',
  'histoire.config.js',
  '.histoire.ts',
  '.histoire.js',
]

export function resolveConfigFile(cwd: string = process.cwd(), configFile?: string): string {
  if (configFile) {
    // explicit config path is always resolved from cwd
    return path.resolve(configFile)
  }
  else {
    return findUp(cwd, configFileNames)
  }
}

export async function loadConfigFile(configFile: string): Promise<Partial<PovesteConfig>> {
  try {
    const jiti = createJiti(__filename, {
      moduleCache: false,
    })
    const result = await jiti.import(configFile, { default: true }) as Partial<PovesteConfig>
    if (!result) {
      throw new Error(`Expected default export in ${configFile}`)
    }
    return result
  }
  catch (e) {
    console.error(pc.red(`Error while loading ${configFile}`))
    throw e
  }
}

export const mergeBuildConfig = createDefu((obj: any, key, value) => {
  if (obj[key] && key === 'excludeFromVendorsChunk') {
    obj[key] = [...obj[key], ...value]
    return true
  }
})

export const mergeConfig = createDefu((obj: any, key, value) => {
  if (obj[key] && key === 'vite') {
    const initialValue = obj[key]

    // Convert to functions
    const initialFn: (...args: any[]) => Promise<any> = typeof initialValue === 'function' ? initialValue : async () => initialValue
    const valueFn: (...args: any[]) => Promise<any> = typeof value === 'function' ? value : async () => value

    obj[key] = async (...args) => {
      // `mergeViteConfig` doesn't accept functions so we need to call them
      const initialResult = await initialFn(...args)
      const valueResult = await valueFn(...args)
      return mergeViteConfig(initialResult, valueResult)
    }

    return true
  }

  if (obj[key] && key === 'plugins') {
    const initialValue = obj[key] as Plugin[]
    const newValue = obj[key] = [...value]
    const nameMap = newValue.reduce((map, plugin) => {
      map[plugin.name] = true
      return map
    }, {})
    for (const plugin of initialValue) {
      if (!nameMap[plugin.name]) {
        newValue.unshift(plugin)
      }
    }
    return true
  }

  if (obj[key] && key === 'setupCode') {
    obj[key] = [...obj[key], ...value]
    return true
  }

  if (obj[key] && key === 'supportMatch') {
    for (const item of value as SupportMatchPattern[]) {
      const existing: SupportMatchPattern = obj[key].find(p => p.id === item.id)
      if (existing) {
        existing.patterns = [...existing.patterns, ...item.patterns]
        existing.pluginIds = [...existing.pluginIds, ...item.pluginIds]
      }
      else {
        obj[key].push(item)
      }
    }
    return true
  }

  if (obj[key] && key === 'build') {
    obj[key] = mergeBuildConfig(obj[key], value)
    return true
  }

  // An ignore list adds to the defaults rather than replacing them. Under the
  // replace rule below, `storyIgnored: ['**/fixtures/**']` silently dropped
  // `**/node_modules/**`, and the watchers then crawled the pnpm store until
  // the build died with EMFILE (#244). `storyMatch` stays on the replace rule:
  // narrowing it is a legitimate use.
  if (obj[key] && key === 'storyIgnored') {
    obj[key] = [...new Set([...obj[key], ...value])]
    return true
  }

  // By default, arrays should be replaced
  if (obj[key] && Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})

export async function resolveConfig(cwd: string = process.cwd(), mode: ConfigMode, configFile: string): Promise<PovesteConfig> {
  let result: Partial<PovesteConfig>
  const resolvedConfigFile = resolveConfigFile(cwd, configFile)
  if (resolvedConfigFile) {
    result = await loadConfigFile(resolvedConfigFile)
  }
  const viteConfig = await resolveViteConfig({}, 'serve')
  // The `histoire` key is our own deprecation, and reading it is the whole
  // point — it is what makes poveste drop-in for an existing histoire config.
  // eslint-disable-next-line ts/no-deprecated
  const vitePovesteConfig = (viteConfig.poveste ?? viteConfig.histoire ?? {}) as PovesteConfig

  const preUserConfig = mergeConfig(result, vitePovesteConfig)
  const processedDefaultConfig = await processDefaultConfig(getDefaultConfig(), preUserConfig, mode, cwd)

  return resolveConfigPlugins(mergeConfig(preUserConfig, processedDefaultConfig), mode)
}

async function resolveConfigPlugins(config: PovesteConfig, mode: ConfigMode): Promise<PovesteConfig> {
  for (const plugin of config.plugins) {
    if (plugin.config) {
      const result = await plugin.config(config, mode)
      if (result) {
        config = mergeConfig(result, config)
      }
    }
  }
  return config
}

async function processDefaultConfig(defaultConfig: PovesteConfig, preUserConfig: PovesteConfig, mode: ConfigMode, _cwd: string): Promise<PovesteConfig> {
  // Apply plugins
  for (const plugin of [...defaultConfig.plugins, ...preUserConfig.plugins ?? []]) {
    if (plugin.defaultConfig) {
      const result = await plugin.defaultConfig(defaultConfig, mode)
      if (result) {
        defaultConfig = mergeConfig(result, defaultConfig)
      }
    }
  }
  return defaultConfig
}

export async function processConfig(ctx: Context) {
  const { config, root } = ctx

  // Resolve files paths

  const resolveFsPath = (file: string, force = false) => {
    if (force || file.startsWith('./') || file.startsWith('../')) {
      return path.resolve(root, file)
    }
    return file
  }

  const fileCheck = (file: string, resolvedFile: string, configPathForError: string) => {
    if (!file.startsWith('http') && !file.startsWith('@') && !fs.existsSync(resolvedFile)) {
      console.warn(pc.yellow(`Poveste config: ${configPathForError} file ${file} does not exist (resolved to ${resolvedFile}), check for typos in the path`))
    }
  }

  config.outDir = resolveFsPath(config.outDir, true)

  // Theme

  if (config.theme?.logo?.square) {
    const file = config.theme.logo.square
    config.theme.logo.square = resolveFsPath(file)
    fileCheck(file, config.theme.logo.square, 'theme.logo.square')
  }

  if (config.theme?.logo?.light) {
    const file = config.theme.logo.light
    config.theme.logo.light = resolveFsPath(file)
    fileCheck(file, config.theme.logo.light, 'theme.logo.light')
  }

  if (config.theme?.logo?.dark) {
    const file = config.theme.logo.dark
    config.theme.logo.dark = resolveFsPath(file)
    fileCheck(file, config.theme.logo.dark, 'theme.logo.dark')
  }

  if (config.theme?.favicon) {
    let file = config.theme.favicon
    if (file.startsWith('/')) {
      file = file.slice(1)
    }
    if (!file.startsWith('http')) {
      const publicDir = path.resolve(ctx.resolvedViteConfig.root, ctx.resolvedViteConfig.publicDir)
      // Resolve URL path
      if (file.startsWith('./') || file.startsWith('../')) {
        const resolvedFile = resolveFsPath(file, true)
        const relativeFile = path.relative(publicDir, resolvedFile)
        if (relativeFile.startsWith('..')) {
          throw new Error(pc.red(`Poveste config: theme.favicon seems to target a file that is not in the vite 'public' directory: ${file} (resolved as ${resolvedFile})`))
        }
        if (!fs.existsSync(resolvedFile)) {
          throw new Error(pc.red(`Poveste config: theme.favicon seems to target a file that does not exist: ${file} (resolved as ${resolvedFile})`))
        }
        config.theme.favicon = relativeFile
      }
      else {
        // Check if URL path is valid
        const resolvedFile = path.resolve(publicDir, file)
        if (!fs.existsSync(resolvedFile)) {
          throw new Error(pc.red(`Poveste config: theme.favicon seems to target a file that does not exist: ${file} (resolved as ${resolvedFile}).\nThe favicon file should be placed in the vite 'public' directory.\nExample: if the file is in <project>/public/img/favicon.ico, you can put 'img/favicon.ico' or './public/img/favicon.ico'.`))
        }
      }
    }
  }
}

export function defineConfig(config: Partial<PovesteConfig>) {
  return config
}

declare module 'vite' {
  interface UserConfig {
    /**
     * Poveste configuration
     */
    poveste?: Partial<PovesteConfig>
    /**
     * @deprecated Use `poveste` instead. Kept for drop-in compat with histoire.
     */
    histoire?: Partial<PovesteConfig>
  }
}
