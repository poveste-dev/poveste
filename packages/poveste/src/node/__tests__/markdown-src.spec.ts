import type { Context } from '../context.js'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createMarkdownFilesWatcher, createMarkdownPlugins } from '../markdown.js'
import { watchStories } from '../stories.js'

let dir: string
let ctx: Context
const cleanups: (() => Promise<unknown> | unknown)[] = []

function write(file: string, text: string, { sibling = true } = {}) {
  const path = join(dir, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  // A story beside it, as a book's would be: a standalone page needs a plugin to collect it.
  if (sibling && path.endsWith('.story.md')) {
    writeFileSync(path.replace(/\.md$/, '.vue'), '')
  }
  return path
}

/** The book lives in `book/`, so a test can name a file outside it. */
async function open(mode: 'build' | 'dev' = 'dev') {
  vi.spyOn(process, 'cwd').mockReturnValue(join(dir, 'book'))
  ctx = await createContext({ mode })
  ctx.config.supportMatch = [{ id: 'vue', patterns: ['**/*.vue', '**/*.js'], pluginIds: ['vue'] }]
  const stories = await watchStories(ctx)
  cleanups.push(() => stories.close())
  const { stop } = await createMarkdownFilesWatcher(ctx)
  cleanups.push(stop)
}

// By its end: chokidar reports a relative path with the platform's separator.
const markdownFile = (name: string) => ctx.markdownFiles.find(file => file.absolutePath.endsWith(`/${name}`))
const html = (name: string) => markdownFile(name)?.html

// Chokidar reports a relative path with the platform's separator, and the client asks for
// a story's docs by a forward-slash one, so only Windows can tell these apart (#1625).
describe('the list of a book\'s markdown', () => {
  const story = (name: string) => ctx.storyFiles.find(file => file.path.endsWith(`/${name}`))
  // What `useStoryDoc` in `StoryDocs.vue` asks for.
  const lookup = (relativePath: string) => relativePath.replace(/\.(\w*)$/, '.md')
  const listed = () => ctx.markdownFiles.map(file => file.relativePath)

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-md-list-')))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map(cleanup => cleanup()))
    vi.restoreAllMocks()
    rmSync(dir, { recursive: true, force: true })
  })

  it('derives the key the way the client does', () => {
    const client = readFileSync(resolve(__dirname, '../../../../poveste-app/src/app/components/panel/StoryDocs.vue'), 'utf8')

    expect(client).toContain(String.raw`filePath.replace(/\.(\w*)$/, '.md')`)
  })

  it('lists a sibling `.story.md` in a subfolder under the key the client looks up', async () => {
    write('book/pages/Tag.story.md', '# Tag')

    await open()

    const lookedUp = lookup(story('Tag.story.vue')!.relativePath)
    expect(listed()).toContain(lookedUp)
    expect(story('Tag.story.vue')!.markdownFile?.relativePath).toBe(lookedUp)
  })

  it('lists a standalone `.story.md` in a subfolder under the key the client looks up', async () => {
    write('book/pages/Guide.story.md', '# Guide', { sibling: false })

    await open()

    expect(listed()).toContain(lookup(story('Guide.story.js')!.relativePath))
  })

  it('updates a page in place when it changes, rather than listing it twice', async () => {
    write('book/pages/Guide.story.md', '# Guide', { sibling: false })
    await open()

    await expect.poll(() => {
      write('book/pages/Guide.story.md', '# Edited', { sibling: false })
      return html('Guide.story.md')
    }, { timeout: 10_000 }).toContain('Edited')
    expect(listed()).toEqual(['pages/Guide.story.md'])
    expect(ctx.storyFiles.filter(file => file.path.endsWith('/Guide.story.js'))).toHaveLength(1)
  })

  it('takes a deleted page and its story off the list', async () => {
    write('book/pages/Guide.story.md', '# Guide', { sibling: false })
    await open()

    unlinkSync(join(dir, 'book/pages/Guide.story.md'))

    await vi.waitFor(() => expect(listed()).toEqual([]), { timeout: 10_000 })
    expect(story('Guide.story.js')).toBeUndefined()
  })

  it('stops pointing a story at its sibling `.story.md` once that is deleted', async () => {
    write('book/pages/Tag.story.md', '# Tag')
    await open()
    expect(story('Tag.story.vue')!.markdownFile).toBeDefined()

    unlinkSync(join(dir, 'book/pages/Tag.story.md'))

    await vi.waitFor(() => expect(story('Tag.story.vue')!.markdownFile).toBeUndefined(), { timeout: 10_000 })
  })

  it('links a `.story.md` only to the story of its own name', async () => {
    write('book/pages/Tag.story.md', '# Tag')
    write('book/pages/Tag.story-old.story.vue', '')

    await open()

    expect(story('Tag.story.vue')!.markdownFile).toBeDefined()
    expect(story('Tag.story-old.story.vue')!.markdownFile).toBeUndefined()
  })

  it('doesn\'t take a stray file for a standalone page\'s story', async () => {
    write('book/pages/Guide.story.md', '# Guide', { sibling: false })
    write('book/pages/Guide.story.md.bak', '# Old')

    await open()

    expect(markdownFile('Guide.story.md')?.isRelatedToStory).toBe(false)
  })

  it('gives two paths that read alike different ids', async () => {
    write('book/pages/tag.story.md', '# Nested')
    write('book/pages-tag.story.md', '# Flat')

    await open()

    expect(new Set(ctx.markdownFiles.map(file => file.id)).size).toBe(2)
  })
})

describe('a `.story.md` with `src`', () => {
  let warn: ReturnType<typeof vi.spyOn>
  let error: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-md-src-')))
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    error = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map(cleanup => cleanup()))
    vi.restoreAllMocks()
    rmSync(dir, { recursive: true, force: true })
  })

  it('shows the file it names, without that file\'s frontmatter', async () => {
    write('book/Page.story.md', '---\nsrc: ./notes/README.md\n---\n')
    write('book/notes/README.md', '---\ntitle: Not this\n---\n# From the README\n')

    await open()

    expect(html('Page.story.md')).toContain('From the README')
    expect(html('Page.story.md')).not.toContain('Not this')
  })

  it('says so when its own text is not what shows', async () => {
    write('book/Page.story.md', '---\nsrc: ./README.md\n---\n# Own text\n')
    write('book/README.md', '# From the README\n')

    await open()

    expect(html('Page.story.md')).not.toContain('Own text')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own text isn\'t shown'))
  })

  it('follows a link to a story from where the loaded file is', async () => {
    write('book/pages/Page.story.md', '---\nsrc: ../README.md\n---\n')
    write('book/README.md', '[Tag](./pages/Tag.story.md)\n')
    write('book/pages/Tag.story.md', '# Tag\n')

    await open()

    expect(html('pages/Page.story.md')).toContain(`href="/story/${markdownFile('pages/Tag.story.md')!.storyFile!.id}"`)
  })

  it('leaves a link to anything else as written, and warns in dev', async () => {
    write('book/Page.story.md', '---\nsrc: ./README.md\n---\n')
    write('book/README.md', '[License](./LICENSE)\n')

    await open()

    expect(html('Page.story.md')).toContain('href="./LICENSE"')
    expect(html('Page.story.md')).not.toContain('data-route')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('./LICENSE'))
  })

  it('leaves that link in a build too, without the warning', async () => {
    write('book/Page.story.md', '---\nsrc: ./README.md\n---\n')
    write('book/README.md', '[License](./LICENSE)\n')

    await open('build')

    expect(html('Page.story.md')).toContain('href="./LICENSE"')
    expect(warn).not.toHaveBeenCalled()
  })

  it('still throws on that link in a `.story.md`\'s own text', async () => {
    write('book/Page.story.md', '[License](./LICENSE)\n')

    await expect(open()).rejects.toThrow('Cannot find story file')
  })

  it('names the missing file on the page in dev', async () => {
    write('book/Page.story.md', '---\nsrc: ./Missing.md\n---\n')

    await open()

    expect(html('Page.story.md')).toContain('src: ./Missing.md')
    expect(error).toHaveBeenCalledWith(expect.stringContaining('src: ./Missing.md'))
  })

  it('fails a build on the missing file', async () => {
    write('book/Page.story.md', '---\nsrc: ./Missing.md\n---\n')

    await expect(open('build')).rejects.toThrow('src: ./Missing.md')
  })

  it('reads a file outside the book', async () => {
    write('book/Page.story.md', '---\nsrc: ../shared/README.md\n---\n')
    write('shared/README.md', '# From outside\n')

    await open()

    expect(html('Page.story.md')).toContain('From outside')
  })

  it('follows edits to the file, including one that deletes and restores it', async () => {
    write('book/Page.story.md', '---\nsrc: ../shared/README.md\n---\n')
    const readme = write('shared/README.md', '# First\n')

    await open()
    expect(html('Page.story.md')).toContain('First')

    await expect.poll(() => {
      writeFileSync(readme, '# Second\n')
      return html('Page.story.md')
    }, { timeout: 10_000 }).toContain('Second')

    unlinkSync(readme)
    await expect.poll(() => html('Page.story.md'), { timeout: 10_000 }).toContain('src: ../shared/README.md')

    await expect.poll(() => {
      writeFileSync(readme, '# Third\n')
      return html('Page.story.md')
    }, { timeout: 10_000 }).toContain('Third')
  })
})

describe('a Vue `<docs>` block', () => {
  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-md-src-')))
    mkdirSync(join(dir, 'book'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    rmSync(dir, { recursive: true, force: true })
  })

  type Hook = (...args: string[]) => string | undefined

  async function hooks(mode: 'build' | 'dev' = 'dev') {
    vi.spyOn(process, 'cwd').mockReturnValue(join(dir, 'book'))
    ctx = await createContext({ mode })
    const plugins = await createMarkdownPlugins(ctx)
    const hook = (name: 'resolveId' | 'load' | 'transform') => (plugins.find(plugin => plugin[name])?.[name] ?? (() => undefined)) as Hook
    return { resolveId: hook('resolveId'), load: hook('load'), transform: hook('transform') }
  }

  async function transform(code: string, id: string) {
    return (await hooks()).transform(code, id)
  }

  it.each(['lang.docs', 'lang.md'])('loads a file through `src`, with %s', async (lang) => {
    const code = '---\ntitle: Not this\n---\n# From the README\n\n[License](./LICENSE)\n'
    const file = write('book/README.md', code)

    const result = await transform(code, `${file}?vue&type=docs&index=0&src=true&${lang}`)

    expect(result).toContain('From the README')
    expect(result).toContain('./LICENSE')
    expect(result).not.toContain('Not this')
  })

  // `@vitejs/plugin-vue` threw on the missing file, which dropped the story in dev (#1665).
  it('names a missing file on the page in dev, resolved against the story', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const story = write('book/pages/Button.story.vue', '<docs src="../Missing.md" />\n')
    const { resolveId, load, transform } = await hooks()

    const id = resolveId('../Missing.md?vue&type=docs&index=0&src=true&lang.docs', story)!

    expect(id).toBe(`${join(dir, 'book/Missing.md')}?vue&type=docs&index=0&src=true&lang.docs`)
    expect(load(id)).toBe('')
    expect(transform('', id)).toContain(`pages/Button.story.vue has \`&lt;docs src=&quot;../Missing.md&quot;&gt;\`, and that isn't a file: ${join(dir, 'book/Missing.md')}`)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('src="../Missing.md"'))
  })

  it('fails a build on a missing file, resolved against the story', async () => {
    const story = write('book/pages/Button.story.vue', '<docs src="../Missing.md" />\n')
    const { resolveId, load, transform } = await hooks('build')

    const id = resolveId('../Missing.md?vue&type=docs&index=0&src=true&lang.docs', story)!

    expect(() => transform(load(id)!, id)).toThrow(`pages/Button.story.vue has \`<docs src="../Missing.md">\`, and that isn't a file: ${join(dir, 'book/Missing.md')}`)
  })

  it('still reads an inline block', async () => {
    const file = write('book/Button.story.vue', '<docs lang="md">\n# Inline\n</docs>\n')

    const result = await transform('# Inline\n', `${file}?vue&type=docs&index=0&lang.md`)

    expect(result).toContain('Inline')
  })

  it('leaves an inline block that isn\'t markdown', async () => {
    const file = write('book/Button.story.vue', '<docs>\nInline\n</docs>\n')

    expect(await transform('Inline\n', `${file}?vue&type=docs&index=0&lang.docs`)).toBeUndefined()
  })

  it('still throws on a link to a non-story in an inline block', async () => {
    const file = write('book/Button.story.vue', '<docs lang="md">\n[License](./LICENSE)\n</docs>\n')

    await expect(transform('[License](./LICENSE)\n', `${file}?vue&type=docs&index=0&lang.md`)).rejects.toThrow('Cannot find story file')
  })
})
