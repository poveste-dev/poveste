import type { ServerMarkdownFile } from '@poveste/shared'
import type { Highlighter } from 'shiki'
import type { Plugin as VitePlugin } from 'vite'
import type { Context } from './context.js'
import type { FenceAt, Twoslash } from './twoslash.js'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import matter from '@11ty/gray-matter'
import { kebabCase } from 'change-case'
import chokidar from 'chokidar'
import fs from 'fs-extra'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import { full as emoji } from 'markdown-it-emoji'
import path from 'pathe'
import pc from 'picocolors'
import { bundledLanguagesInfo, createHighlighter, guessEmbeddedLanguages, isSpecialLang } from 'shiki'
import { addStory, notifyStoryChange, removeStory } from './stories.js'
import { createTwoslash } from './twoslash.js'
import { slugify } from './util/slugify.js'
import { unregister } from './util/unregister.js'
import { createWatchIgnore } from './util/watch-ignore.js'

const onMarkdownListChangeHandlers: (() => unknown)[] = []

export function onMarkdownListChange(handler: () => unknown): () => void {
  onMarkdownListChangeHandlers.push(handler)
  return unregister(onMarkdownListChangeHandlers, handler)
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

export function onMarkdownFileChange(handler: (file: ServerMarkdownFile) => unknown): () => void {
  onMarkdownFileChangeHandlers.push(handler)
  return unregister(onMarkdownFileChangeHandlers, handler)
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

/** The line of `source` that `content` starts on: frontmatter and a Vue SFC's other blocks come first. */
function firstLineIn(source: string, content: string): number {
  const start = source.indexOf(content)
  return start <= 0 ? 1 : source.slice(0, start).split('\n').length
}

// One per book rather than per renderer: each Vite server has its own renderer, and
// each compiled every block again and warned about it again (#1571).
const twoslashes = new WeakMap<Context, Twoslash>()

export async function createMarkdownRenderer(ctx: Context) {
  const highlighter = await getHighlighter()
  const toHtml = (code: string, lang: string, transformers?: unknown[]) => highlighter.codeToHtml(code, { theme: 'github-dark', lang: loadFence(highlighter, code, lang), transformers: transformers as never })
  const twoslash = twoslashes.get(ctx) ?? createTwoslash(ctx.root, toHtml)
  twoslashes.set(ctx, twoslash)
  /*
   * Unprefixed utilities: the `ptw-` prefix went away with Tailwind v4, and
   * `not-prose` in particular is matched by the typography plugin's own
   * `[class~="not-prose"]` selector, so a prefixed spelling silently opts the
   * block back *into* prose. These classes are generated because main.pcss
   * `@source`s this file — v4 auto-detection only scans the app package.
   */
  const codeBlock = (lang: string, html: string) => `<div class="relative not-prose __poveste-code __histoire-code"><div class="absolute top-0 right-0 text-xs text-white/40">${lang}</div>${html}</div>`

  const md = new MarkdownIt({
    highlight: (code, lang) => codeBlock(lang, toHtml(code, lang)),
    linkify: true,
    html: true,
    breaks: false,
  })

  // markdown-it 15's linkify-it 6 stopped linking bare domains such as
  // `www.example.com` by default. Docs written against the previous release
  // relied on it, so it stays on.
  md.linkify.set({ fuzzyLink: true })

  // Here rather than in `highlight`, which is handed neither the file nor the line a Twoslash message names.
  const renderFence = md.renderer.rules['fence']!
  md.renderer.rules['fence'] = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!
    if (!token.info.trim().split(/\s+/).slice(1).includes('twoslash')) {
      return renderFence(tokens, idx, options, env, self)
    }
    const line = token.map ? token.map[0] + (Number(env?.['firstLine']) || 1) : undefined
    const at: FenceAt = { ...env?.['file'] ? { file: path.relative(ctx.root, String(env['file'])) } : {}, ...line !== undefined ? { line } : {} }
    return renderFence(tokens, idx, { ...options, highlight: (code, lang) => codeBlock(lang, twoslash(code, lang, at) ?? toHtml(code, lang)) }, env, self)
  }

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
    const defaultRender = md.renderer.rules['link_open'] || function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options)
    }

    md.renderer.rules['link_open'] = function (tokens, idx, options, env, self) {
      const token = tokens[idx]
      if (!token) {
        return defaultRender(tokens, idx, options, env, self)
      }
      // markdown-it 15 types an attribute value as `string | number`.
      const href = token.attrGet('href')?.toString() ?? null

      if (href !== null) {
        if (href.startsWith('.')) {
          const queryIndex = href.indexOf('?')
          const pathname = queryIndex >= 0 ? href.slice(0, queryIndex) : href
          const query = queryIndex >= 0 ? href.slice(queryIndex) : ''

          // File lookup
          const file = path.resolve(path.dirname(String(env?.['file'])), pathname)
          const storyFile = ctx.storyFiles.find(f => f.path === file)
          const mdFile = ctx.markdownFiles.find(f => f.absolutePath === file)
          const storyId = storyFile?.id ?? mdFile?.storyFile?.id
          if (!storyId) {
            if (!env?.['loaded']) {
              throw new Error(pc.red(`[md] Cannot find story file: ${pathname} from ${env?.['file']}`))
            }
            // A README links to its own LICENSE: it wasn't written for a book (#161).
            if (ctx.mode === 'dev') {
              console.warn(pc.yellow(`[md] ${env['file']} links to ${pathname}, which isn't a story, so the link stays as written`))
            }
            return defaultRender(tokens, idx, options, env, self)
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

  // An HTML parser reads `<poveste-story … />` as an open tag and swallows what follows,
  // so it never reaches one. A code block's copy is escaped by now (#444).
  const render = md.render.bind(md)
  md.render = (src, env) => render(src, env).replace(/<poveste-story\b([^>]*?)\/?>(?:\s*<\/poveste-story>)?/g, (_, attrs: string) => {
    const attr = (name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? ''
    return `<div class="not-prose" data-poveste-story="${attr('id')}" data-poveste-variant="${attr('variant')}"></div>`
  })

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

  const isLoadedDocs = (id: string) => id.includes('?vue&type=docs') && id.includes('&src=true')
  const isFile = (file: string) => Boolean(fs.statSync(file, { throwIfNoEntry: false })?.isFile())
  /** The story and the `src` as written that each loaded file was asked for by. */
  const loadedBy = new Map<string, { story: string, src: string }>()
  let watcher: { add: (file: string) => unknown } | undefined

  // Ahead of Vite's resolver and `@vitejs/plugin-vue`'s loader: a missing file was left
  // unresolved and the loader threw on it, which dropped the whole story (#1665).
  plugins.push({
    name: 'poveste-vue-docs-src',
    enforce: 'pre',
    configureServer(server) {
      watcher = server.watcher
    },
    resolveId(source, importer) {
      // `@vitejs/plugin-vue` watches the file it loads, and Vite resolves that as an import.
      if (loadedBy.has(source)) return isFile(source) ? undefined : source
      if (!importer || !source.startsWith('.') || !isLoadedDocs(source)) return
      const [src = '', query] = source.split('?', 2)
      const story = importer.replace(/\?.*$/, '')
      const target = path.resolve(path.dirname(story), src)
      loadedBy.set(target, { story, src })
      if (isFile(target)) return
      return `${target}?${query}`
    },
    load(id) {
      return isLoadedDocs(id) && !isFile(id.substring(0, id.indexOf('?vue'))) ? '' : undefined
    },
  })

  // @TODO extract
  plugins.push({
    name: 'poveste-vue-docs-block',
    transform(code, id) {
      if (!id.includes('?vue&type=docs')) return
      // A block with `src` and no `lang` reaches here as `lang.docs` (#161).
      const loaded = id.includes('&src=true')
      if (!loaded && !id.includes('lang.md')) return
      const file = id.substring(0, id.indexOf('?vue'))
      let html: string
      if (loaded && !isFile(file)) {
        const { story, src } = loadedBy.get(file) ?? { story: file, src: file }
        const message = `[md] ${path.relative(ctx.root, story)} has \`<docs src="${src}">\`, and that isn't a file: ${file}`
        if (ctx.mode !== 'dev') {
          throw new Error(pc.red(message))
        }
        console.error(pc.red(message))
        // Vite watches a file outside the book only once it exists.
        watcher?.add(file)
        html = `<p>${md.utils.escapeHtml(message)}</p>`
      }
      else {
        const content = loaded ? matter(code).content : code
        html = md.render(content, {
          file,
          firstLine: firstLineIn(fs.readFileSync(file, 'utf8'), content),
          loaded,
        })
      }
      if (!loaded || ctx.mode !== 'dev') {
        return `export default Comp => {
        Comp.doc = ${JSON.stringify(html)}
      }`
      }
      // The story file hasn't changed, so nothing else tells the docs pane (#161).
      return `export const html = ${JSON.stringify(html)}
// The collector's runner has a \`hot\` with no \`data\`, and Vite only sees this spelling of \`accept\`.
const comps = import.meta.hot?.data ? (import.meta.hot.data.comps ??= []) : []
export default Comp => {
  Comp.doc = html
  comps.push(Comp)
}
if (import.meta.hot?.data) {
  import.meta.hot.accept((mod) => {
    for (const comp of mod ? comps : []) {
      // Not there in a sandbox, which has no docs pane.
      window.__pvt_md_hmr?.({ relativePath: comp.__file.slice(${ctx.root.length + 1}).replace(/\\.\\w*$/, '.md'), html: mod.html })
    }
  })
}`
    },
  })

  return plugins
}

/** `Tag.story.vue` for `Tag.story`, and not `Tag.story-old.vue` or `Tag.story.md.bak`. */
function isSibling(file: string, stem: string): boolean {
  return file.startsWith(`${stem}.`) && !file.slice(stem.length + 1).includes('.')
}

/**
 * The story a standalone `.story.md` gets: no sibling story file, so its story
 * is derived from frontmatter rather than collected from source.
 */
function derivedStoryCode(frontmatter: Record<string, any>): string {
  return `export default ${JSON.stringify({
    id: frontmatter['id'],
    title: frontmatter['title'],
    icon: frontmatter['icon'] ?? 'carbon:document-blank',
    iconColor: frontmatter['iconColor'],
    group: frontmatter['group'],
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

  // Added to as files name them: a README needn't match anything the book collects.
  const loadedWatcher = chokidar.watch([], { ignoreInitial: true })

  /**
   * Initial scan is complete.
   */
  let watcherIsReady = false

  function loadedPath(file: ServerMarkdownFile): string | undefined {
    const src = file.frontmatter?.src
    return typeof src === 'string' && src ? path.resolve(path.dirname(file.absolutePath), src) : undefined
  }

  /** What a `.story.md` shows: its own body, or the file its frontmatter's `src` names (#161). */
  function render(file: ServerMarkdownFile): string {
    const target = loadedPath(file)
    const content = file.content ?? ''

    if (!target) {
      return md.render(content, {
        file: file.absolutePath,
        firstLine: firstLineIn(fs.readFileSync(file.absolutePath, 'utf8'), content),
      })
    }

    loadedWatcher.add(target)

    if (!fs.statSync(target, { throwIfNoEntry: false })?.isFile()) {
      const message = `[md] ${file.relativePath} has \`src: ${file.frontmatter?.src}\`, and that isn't a file: ${target}`
      if (ctx.mode !== 'dev') {
        throw new Error(pc.red(message))
      }
      // An editor's save can pass through here, and the page is where it's being read.
      console.error(pc.red(message))
      return `<p>${md.utils.escapeHtml(message)}</p>`
    }

    if (ctx.mode === 'dev' && content.trim()) {
      console.warn(pc.yellow(`[md] ${file.relativePath} has \`src\`, so its own text isn't shown`))
    }

    const source = fs.readFileSync(target, 'utf8')
    const loaded = matter(source).content
    return md.render(loaded, {
      file: target,
      firstLine: firstLineIn(source, loaded),
      loaded: true,
    })
  }

  function addFile(relativePath: string) {
    const absolutePath = path.resolve(ctx.root, relativePath)
    const dirFiles = fs.readdirSync(path.dirname(absolutePath))
    const truncatedName = path.basename(absolutePath, '.md')
    const isRelatedToStory = dirFiles.some(file => !file.endsWith('.md') && isSibling(file, truncatedName))

    const source = fs.readFileSync(absolutePath, 'utf8')
    const { data: frontmatter, content } = matter(source)

    const file: ServerMarkdownFile = {
      // The hash because `kebabCase` flattens separators: `a/b.md` and `a-b.md` read the same.
      id: `${kebabCase(relativePath.toLowerCase())}-${createHash('sha256').update(relativePath).digest('hex').slice(0, 8)}`,
      relativePath,
      absolutePath,
      isRelatedToStory,
      frontmatter,
      content,
    }

    // We don't immediately render markdown during initial scanning in case
    // markdown references other files in links (otherwise they might not
    // be scanned yet and will throw 'not found' errors).
    if (watcherIsReady) {
      file.html = render(file)
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
      const storyFile = ctx.storyFiles.find(f => isSibling(f.relativePath, searchPath))
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
    const file = ctx.markdownFiles[index]
    if (file) {
      if (!file.isRelatedToStory) {
        if (file.storyFile) {
          removeStory(file.storyFile.relativePath)
        }
        notifyStoryChange()
      }
      else if (file.storyFile) {
        file.storyFile.markdownFile = undefined
        notifyStoryChange(file.storyFile)
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

    const source = fs.readFileSync(file.absolutePath, 'utf8')
    const { data: frontmatter, content } = matter(source)

    file.frontmatter = frontmatter
    file.content = content

    // Rewritten in place rather than by removing and re-adding the story:
    // `moduleId` is derived from the path, so a re-added story carries the id
    // the client already imported and nothing would tell it to look again
    // (#539).
    if (!file.isRelatedToStory && file.storyFile) {
      file.storyFile.moduleCode = derivedStoryCode(frontmatter)
    }
    file.html = render(file)

    notifyMarkdownFileChange(file)
    if (file.storyFile) {
      notifyStoryChange(file.storyFile)
    }
    notifyMarkdownListChange()
  }

  async function stop() {
    await Promise.all([watcher.close(), loadedWatcher.close()])
  }

  // Chokidar reports the platform's separator, and the client looks a story's docs up by
  // a forward-slash path (#1625).
  const normalized = (handle: (file: string) => unknown) => (file: string) => handle(path.normalize(file))

  watcher
    .on('add', normalized(addFile))
    .on('change', normalized(updateFile))
    .on('unlink', normalized(removeFile))

  loadedWatcher.on('all', (_event, changed) => {
    const target = path.resolve(changed)
    for (const file of ctx.markdownFiles.filter(file => loadedPath(file) === target)) {
      updateFile(file.relativePath)
    }
  })

  await new Promise((resolve) => {
    watcher.once('ready', resolve as () => void)
  })

  try {
    // Render markdown after initial scan is complete.
    for (const mdFile of ctx.markdownFiles) {
      mdFile.html = render(mdFile)
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
