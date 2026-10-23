import type { ServerStoryFile, SupportMatchPattern, SupportPlugin } from '@poveste/shared'
import type { Context } from './context.js'
import { readFileSync } from 'node:fs'
import { kebabCase } from 'change-case'
import chokidar from 'chokidar'
import { basename, extname, relative, resolve } from 'pathe'
import pc from 'picocolors'
import picomatch from 'picomatch'
import { glob } from 'tinyglobby'
import { escapeRegExp } from './util/escape-regexp.js'
import { unregister } from './util/unregister.js'
import { createWatchIgnore } from './util/watch-ignore.js'

type StoryChangeHandler = (file?: ServerStoryFile) => unknown
const storyChangeHandlers: StoryChangeHandler[] = []

/**
 * Called when a new story is added or modified. Collecting should be done.
 * Returns the function that unregisters it, which a dev server calls on close:
 * the handler closes over that server (#877).
 */
export function onStoryChange(handler: StoryChangeHandler): () => void {
  storyChangeHandlers.push(handler)
  return unregister(storyChangeHandlers, handler)
}

export function notifyStoryChange(file?: ServerStoryFile) {
  for (const handler of storyChangeHandlers) {
    handler(file)
  }
}

type StoryListChangeHandler = () => unknown
const storyListChangeHandlers: StoryListChangeHandler[] = []

/**
 * Called when the story list has changed (ex: removed a story). No collecting should be needed.
 * Returns the function that unregisters it.
 */
export function onStoryListChange(handler: StoryListChangeHandler): () => void {
  storyListChangeHandlers.push(handler)
  return unregister(storyListChangeHandlers, handler)
}

export function notifyStoryListChange() {
  for (const handler of storyListChangeHandlers) {
    handler()
  }
}

let context: Context

export async function watchStories(newContext: Context) {
  context = newContext

  const baseWatchPaths = Array.from(new Set(context.config.storyMatch.map((pattern) => {
    const segments = pattern.split('/')
    return segments.slice(0, segments.findIndex(segment => segment.includes('*'))).join('/') || '.'
  })))

  const resolvedStoryIgnored = context.config.storyIgnored.map((pattern) => {
    return resolve(context.root, pattern)
  })

  const resolveStoryMatch = context.config.storyMatch.map((pattern) => {
    return resolve(context.root, pattern)
  })

  const watcher = chokidar.watch(baseWatchPaths, {
    cwd: context.root,
    ignored: createWatchIgnore(resolvedStoryIgnored, resolveStoryMatch),
  })

  watcher
    .on('add', (file) => {
      const storyFile = addStory(file)
      setTimeout(notifyStoryChange, 100, storyFile) // Delay in case file renaming fired Add event before Unlink event
    })
    .on('unlink', (file) => {
      removeStory(file)
      notifyStoryListChange()
    })

  // The markdown watcher starts next and links each doc to its story, so a story
  // its scan has not reached yet left a link to it throwing (#1479).
  await new Promise<void>(resolve => watcher.once('ready', () => resolve()))
  return watcher
}

function getAbsoluteFilePath(relativeFilePath: string) {
  return resolve(context.root, relativeFilePath)
}

// The plugin a story's extension needs, where one plugin alone collects it. A
// Quasar book without `HstVue()` was told only that nothing claimed its story,
// which named neither the file's plugin nor which ones had looked (#1337).
const PLUGIN_FOR_EXTENSION: Record<string, string> = {
  '.vue': '`HstVue()` from `@poveste/plugin-vue`',
  '.svelte': '`HstSvelte()` from `@poveste/plugin-svelte`',
}

export function noSupportPluginMessage(file: string, supportMatch: SupportMatchPattern[]): string {
  const claimed = supportMatch.map(p => `${p.id} (${p.patterns.join(', ')})`).join(', ')
  const extension = extname(file)
  const needed = PLUGIN_FOR_EXTENSION[extension]
  return [
    `No support plugin found for file ${file}.`,
    `What this book's plugins collect: ${claimed || 'nothing'}.`,
    ...needed ? [`A \`${extension}\` story needs ${needed} in the config's \`plugins\`.`] : [],
  ].join(' ')
}

function importsModule(source: string, moduleName: string): boolean {
  return new RegExp(`(?:\\bfrom|\\bimport)\\s*\\(?\\s*['"]${escapeRegExp(moduleName)}(?:/[^'"]*)?['"]`).test(source)
}

/**
 * Which support plugin renders a story file, and what to say when that is a guess.
 *
 * Solid and React both claim `*.story.tsx`, and the first plugin in `plugins`
 * rendered every such file, so a book could not hold both (#1273). When more than
 * one plugin claims a file, the one the file imports decides: every Solid or React
 * story imports `defineStory` from its plugin. A file importing both, or neither
 * (a helper re-exporting `defineStory`), goes to the first, as before, with a
 * warning that names the plugins and the way to choose.
 */
export function chooseSupportPlugin(
  file: string,
  readSource: () => string | undefined,
  supportMatch: SupportMatchPattern[],
  supportPlugins: Pick<SupportPlugin, 'id' | 'moduleName'>[],
): { pluginId: string | undefined, warning?: string } {
  const claimants = [...new Set(supportMatch
    .filter(p => picomatch.isMatch(file, p.patterns, { dot: true }))
    .map(p => p.pluginIds[0])
    .filter((id): id is string => id !== undefined))]
  if (claimants.length <= 1) {
    return { pluginId: claimants[0] }
  }

  const moduleOf = (id: string) => supportPlugins.find(p => p.id === id)?.moduleName ?? id
  const source = readSource()
  const imported = source === undefined ? [] : claimants.filter(id => importsModule(source, moduleOf(id)))
  if (imported.length === 1) {
    return { pluginId: imported[0] }
  }

  const first = claimants[0]!
  const names = claimants.map(id => `\`${moduleOf(id)}\``).join(' and ')
  return {
    pluginId: first,
    warning: imported.length > 1
      ? `${file} imports both ${names}, so it is rendered by the first in \`plugins\`, \`${moduleOf(first)}\`.`
      : `${file} is claimed by ${names} and imports neither, so it is rendered by the first in \`plugins\`, \`${moduleOf(first)}\`. To choose, import \`defineStory\` from one of them in the story file.`,
  }
}

export function addStory(relativeFilePath: string, virtualModuleCode?: string) {
  const absoluteFilePath = getAbsoluteFilePath(relativeFilePath)

  for (const file of context.storyFiles) {
    if (file.path === absoluteFilePath) {
      return file
    }
  }

  const fileId = kebabCase(relativeFilePath.toLowerCase())
  let fileName = basename(relativeFilePath)
  if (fileName.includes('.')) {
    fileName = fileName.substring(0, fileName.indexOf('.'))
  }

  // Once per file: a file already known returned above, so a reload or a
  // re-collection does not print it again.
  const { pluginId: supportPluginId, warning } = chooseSupportPlugin(
    absoluteFilePath,
    () => {
      try {
        return virtualModuleCode ?? readFileSync(absoluteFilePath, 'utf8')
      }
      catch {
        return undefined
      }
    },
    context.config.supportMatch,
    context.supportPlugins,
  )
  if (warning) {
    console.warn(pc.yellow(`⚠️  ${warning}`))
  }

  if (!supportPluginId) {
    throw new Error(noSupportPluginMessage(absoluteFilePath, context.config.supportMatch))
  }

  // A plugin adds its story by absolute path, and `relativePath` and a virtual
  // module's id are published in a built book (#1383).
  const relativePath = relative(context.root, absoluteFilePath)
  const file: ServerStoryFile = {
    id: fileId, // The file id will be changed by the story id after it is collected
    path: absoluteFilePath,
    relativePath,
    fileName,
    moduleId: virtualModuleCode ? `virtual:story:${relativePath}` : absoluteFilePath,
    supportPluginId,
    virtual: !!virtualModuleCode,
    moduleCode: virtualModuleCode,
  }
  context.storyFiles.push(file)
  return file
}

export function removeStory(relativeFilePath: string) {
  const absoluteFilePath = getAbsoluteFilePath(relativeFilePath)
  const index = context.storyFiles.findIndex(file => file.path === absoluteFilePath)
  if (index !== -1) context.storyFiles.splice(index, 1)
}

export async function findAllStories(newContext: Context) {
  context = newContext

  const files = await glob(context.config.storyMatch, {
    cwd: context.root,
    ignore: context.config.storyIgnored,
  })
  context.storyFiles.length = 0
  for (const file of files) {
    addStory(file)
  }
}
