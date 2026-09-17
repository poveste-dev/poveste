import type { ServerMarkdownFile } from '@poveste/shared'
import type { Highlighter } from 'shiki'
import type { Plugin as VitePlugin } from 'vite'
import type { Context } from './context.js'
import { createRequire } from 'node:module'
import { kebabCase } from 'change-case'
import chokidar from 'chokidar'
import fs from 'fs-extra'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import { full as emoji } from 'markdown-it-emoji'
import path from 'pathe'
import pc from 'picocolors'
import { bundledLanguagesInfo, createHighlighter, guessEmbeddedLanguages, isSpecialLang } from 'shiki'
import { addStory, notifyStoryChange, removeStory } from './stories.js'
import { slugify } from './util/slugify.js'
import { createWatchIgnore } from './util/watch-ignore.js'

const onMarkdownListChangeHandlers: (() => unknown)[] = []

export function onMarkdownListChange(handler: () => unknown) {
  onMarkdownListChangeHandlers.push(handler)
}

function notifyMarkdownListChange() {
  for (const handler of onMarkdownListChangeHandlers) {
    handler()
  }
}

/**
 * One markdown file's *content* changed, as distinct from the list of files
 * changing.
 *
 * The rendered html reaches the client as its own virtual module,
 * `virtual:md:<id>`, so invalidating the list module is not enough to repaint an
 * open docs pane — the list is the same, and only that file's module is stale
 * (#370). The module already carries the `import.meta.hot.accept` half.
 */
const onMarkdownFileChangeHandlers: ((file: ServerMarkdownFile) => unknown)[] = []

export function onMarkdownFileChange(handler: (file: ServerMarkdownFile) => unknown) {
  onMarkdownFileChangeHandlers.push(handler)
}

function notifyMarkdownFileChange(file: ServerMarkdownFile) {
  for (const handler of onMarkdownFileChangeHandlers) {
    handler(file)
  }
}

/**
 * Shared between the markdown Vite plugin and the markdown file watcher, which
 * both build a renderer — a `poveste build` reaches this three times.
 */
let highlighterPromise: Promise<Highlighter> | undefined

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ['github-dark'],
    langs: [],
  })

  return highlighterPromise
}

const require = createRequire(import.meta.url)

const grammarIds = new Map<string, string>()
for (const { id, aliases } of bundledLanguagesInfo) {
  grammarIds.set(id, id)
  for (const alias of aliases ?? []) {
    grammarIds.set(alias, id)
  }
}

/**
 * The grammar a fence names, loaded the first time one asks for it (#825).
 *
 * markdown-it's `highlight` is synchronous, which is why every bundled grammar
 * used to load up front: 2.4 s and ~100 MB on each start. A grammar module has
 * no top-level await, so it can be required synchronously instead. A language
 * shiki does not bundle renders as plain text, where it used to throw.
 */
function loadFence(highlighter: Highlighter, code: string, lang: string): string {
  const id = loadGrammar(highlighter, lang)
  // A grammar loads some of what it embeds only on request, such as a Vue
  // block's `<style lang="scss">`; loading everything used to cover for that.
  for (const embedded of guessEmbeddedLanguages(code, id)) {
    loadGrammar(highlighter, embedded)
  }
  return id
}

function loadGrammar(highlighter: Highlighter, lang: string): string {
  if (isSpecialLang(lang)) {
    return lang
  }
  const id = grammarIds.get(lang)
  if (!id) {
    return 'text'
  }
  if (!highlighter.getLoadedLanguages().includes(id)) {
    highlighter.loadLanguageSync(require(`shiki/langs/${id}.mjs`).default)
  }
  return id
}

export async function createMarkdownRenderer(ctx: Context) {
  const highlighter = await getHighlighter()

  const md = new MarkdownIt({
    /*
     * Unprefixed utilities: the `ptw-` prefix went away with Tailwind v4, and
     * `not-prose` in particular is matched by the typography plugin's own
     * `[class~="not-prose"]` selector, so a prefixed spelling silently opts the
     * block back *into* prose. These classes are generated because main.pcss
     * `@source`s this file — v4 auto-detection only scans the app package.
     */
    highlight: (code, lang) => `<div class="relative not-prose __poveste-code __histoire-code"><div class="absolute top-0 right-0 text-xs text-white/40">${lang}</div>${highlighter.codeToHtml(code, { theme: 'github-dark', lang: loadFence(highlighter, code, lang) })}</div>`,
    linkify: true,
    html: true,
    breaks: false,
  })

  // markdown-it 15's linkify-it 6 stopped linking bare domains such as
  // `www.example.com` by default. Docs written against the previous release
  // relied on it, so it stays on.
  md.linkify.set({ fuzzyLink: true })

  md.use(anchor, {
    slugify,
    permalink: anchor.permalink.ariaHidden({}),
    // A repeated `{#id}` threw and took the whole build down without naming the
    // file. Suffixed instead, the way two headings with the same text already are.
    failOnNonUnique: false,
  })
    // markdown-it-attrs 5 moves a fence's `{.class}` to `<pre>`, but only when
    // its own CommonJS copy of markdown-it's fence rule is the one installed, so
    // from this ESM import it happens not to. Pinned to `<code>`, where 4 put it.
    .use(attrs, { fenceAttrsOnPre: false })
    .use(emoji)

  // External links
  {
    const defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options)
    }

    md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      const token = tokens[idx]
      // markdown-it 15 types an attribute value as `string | number`.
      const href = token.attrGet('href')?.toString() ?? null

      if (href !== null) {
        if (href.startsWith('.')) {
          const queryIndex = href.indexOf('?')
          const pathname = queryIndex >= 0 ? href.slice(0, queryIndex) : href
          const query = queryIndex >= 0 ? href.slice(queryIndex) : ''

          // File lookup
          const file = path.resolve(path.dirname(String(env?.file)), pathname)
          const storyFile = ctx.storyFiles.find(f => f.path === file)
          const mdFile = ctx.markdownFiles.find(f => f.absolutePath === file)
          const storyId = storyFile?.id ?? mdFile?.storyFile?.id
          if (!storyId) {
            throw new Error(pc.red(`[md] Cannot find story file: ${pathname} from ${env?.file}`))
          }

          // Add attributes
          const newHref = `${ctx.resolvedViteConfig.base}story/${encodeURIComponent(storyId)}${query}`
          token.attrSet('href', newHref)
          token.attrSet('data-route', 'true')
        }
        else if (!href.startsWith('/') && !href.startsWith('#') && !token.attrGet('class')?.toString().includes('header-anchor')) {
          // Add target="_blank" to external links, replacing any target already set
          token.attrSet('target', '_blank')
        }
      }

      // pass token to default renderer.
      return defaultRender(tokens, idx, options, env, self)
    }
  }

  return md
}

async function createMarkdownRendererWithPlugins(ctx: Context) {
  let md = await createMarkdownRenderer(ctx)
  if (ctx.config.markdown) {
    const result = await ctx.config.markdown(md)
    if (result) {
      md = result
    }
  }
  return md
}

export async function createMarkdownPlugins(ctx: Context) {
  const plugins: VitePlugin[] = []
  const md = await createMarkdownRendererWithPlugins(ctx)

  // @TODO extract
  plugins.push({
    name: 'poveste-vue-docs-block',
    transform(code, id) {
      if (!id.includes('?vue&type=docs')) return
      if (!id.includes('lang.md')) return
      const file = id.substring(0, id.indexOf('?vue'))
      const html = md.render(code, {
        file,
      })
      return `export default Comp => {
        Comp.doc = ${JSON.stringify(html)}
      }`
    },
  })

  return plugins
}

/**
 * The story a standalone `.story.md` gets: no sibling story file, so its story
 * is derived from frontmatter rather than collected from source.
 */
function derivedStoryCode(frontmatter: Record<string, any>): string {
  return `export default ${JSON.stringify({
    id: frontmatter.id,
    title: frontmatter.title,
    icon: frontmatter.icon ?? 'carbon:document-blank',
    iconColor: frontmatter.iconColor,
    group: frontmatter.group,
    docsOnly: true,
    variants: [],
  })}`
}

export async function createMarkdownFilesWatcher(ctx: Context) {
  const md = await createMarkdownRendererWithPlugins(ctx)

  const watcher = chokidar.watch('.', {
    cwd: ctx.root,
    ignored: createWatchIgnore(ctx.config.storyIgnored, ['**/*.story.md']),
  })

  /**
   * Initial scan is complete.
   */
  let watcherIsReady = false

  function addFile(relativePath: string) {
    const absolutePath = path.resolve(ctx.root, relativePath)
    const dirFiles = fs.readdirSync(path.dirname(absolutePath))
    const truncatedName = path.basename(absolutePath, '.md')
    const isRelatedToStory = dirFiles.some(file => !file.endsWith('.md') && file.startsWith(truncatedName))

    const { data: frontmatter, content } = matter(fs.readFileSync(absolutePath, 'utf8'))

    let html: string | undefined

    // We don't immediately render markdown during initial scanning in case
    // markdown references other files in links (otherwise they might not
    // be scanned yet and will throw 'not found' errors).
    if (watcherIsReady) {
      html = md.render(content, {
        file: absolutePath,
      })
    }

    const file: ServerMarkdownFile = {
      id: kebabCase(relativePath.toLowerCase()),
      relativePath,
      absolutePath,
      isRelatedToStory,
      frontmatter,
      content,
      html,
    }
    ctx.markdownFiles.push(file)

    if (!isRelatedToStory) {
      const storyRelativePath = relativePath.replace(/\.md$/, '.js')
      const storyFile = addStory(storyRelativePath, derivedStoryCode(frontmatter))
      file.storyFile = storyFile
      storyFile.markdownFile = file
      notifyStoryChange(storyFile)
    }
    else {
      const searchPath = path.join(path.dirname(relativePath), truncatedName)
      const storyFile = ctx.storyFiles.find(f => f.relativePath.startsWith(searchPath))
      if (storyFile) {
        file.storyFile = storyFile
        storyFile.markdownFile = file
        notifyStoryChange(storyFile)
      }
    }

    notifyMarkdownListChange()

    return file
  }

  function removeFile(relativePath: string) {
    const index = ctx.markdownFiles.findIndex(file => file.relativePath === relativePath)
    if (index !== -1) {
      const file = ctx.markdownFiles[index]
      if (!file.isRelatedToStory) {
        if (file.storyFile) {
          removeStory(file.storyFile.relativePath)
        }
        notifyStoryChange()
      }
      ctx.markdownFiles.splice(index, 1)
      notifyMarkdownListChange()
    }
  }

  /**
   * Chokidar emits `change` for an edit to an existing file, and nothing
   * handled it: `addFile` is the only path that reads and renders markdown, and
   * it ran on `add` alone, so an edit was watched, delivered and dropped (#370).
   *
   * Story files get away with the same two-handler shape because they travel
   * through Vite's module graph and Vite updates them. Markdown does not —
   * `addFile` reads and renders in Node, outside the graph.
   */
  function updateFile(relativePath: string) {
    const file = ctx.markdownFiles.find(file => file.relativePath === relativePath)
    if (!file) {
      // Not tracked yet — a file that did not match when it was added, say.
      addFile(relativePath)
      return
    }

    const { data: frontmatter, content } = matter(fs.readFileSync(file.absolutePath, 'utf8'))

    file.frontmatter = frontmatter
    file.content = content

    // Rewritten in place rather than by removing and re-adding the story:
    // `moduleId` is derived from the path, so a re-added story carries the id
    // the client already imported and nothing would tell it to look again
    // (#539).
    if (!file.isRelatedToStory && file.storyFile) {
      file.storyFile.moduleCode = derivedStoryCode(frontmatter)
    }
    file.html = md.render(content, {
      file: file.absolutePath,
    })

    notifyMarkdownFileChange(file)
    if (file.storyFile) {
      notifyStoryChange(file.storyFile)
    }
    notifyMarkdownListChange()
  }

  async function stop() {
    await watcher.close()
  }

  watcher
    .on('add', (relativePath) => {
      addFile(relativePath)
    })
    .on('change', (relativePath) => {
      updateFile(relativePath)
    })
    .on('unlink', (relativePath) => {
      removeFile(relativePath)
    })

  await new Promise((resolve) => {
    watcher.once('ready', resolve as () => void)
  })

  try {
    // Render markdown after initial scan is complete.
    for (const mdFile of ctx.markdownFiles) {
      mdFile.html = md.render(mdFile.content ?? '', {
        file: mdFile.absolutePath,
      })
    }
    watcherIsReady = true

    return {
      stop,
    }
  }
  catch (e) {
    await stop()
    throw e
  }
}

export type MarkdownFilesWatcher = ReturnType<typeof createMarkdownFilesWatcher>
