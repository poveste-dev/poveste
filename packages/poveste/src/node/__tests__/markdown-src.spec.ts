import type { Context } from '../context.js'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createMarkdownFilesWatcher, createMarkdownPlugins } from '../markdown.js'
import { watchStories } from '../stories.js'

let dir: string
let ctx: Context
const cleanups: (() => Promise<unknown> | unknown)[] = []

function write(file: string, text: string) {
  const path = join(dir, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  // A story beside it, as a book's would be: a standalone page needs a plugin to collect it.
  if (path.endsWith('.story.md')) {
    writeFileSync(path.replace(/\.md$/, '.vue'), '')
  }
  return path
}

/** The book lives in `book/`, so a test can name a file outside it. */
async function open(mode: 'build' | 'dev' = 'dev') {
  vi.spyOn(process, 'cwd').mockReturnValue(join(dir, 'book'))
  ctx = await createContext({ mode })
  ctx.config.supportMatch = [{ id: 'vue', patterns: ['**/*.vue'], pluginIds: ['vue'] }]
  const stories = await watchStories(ctx)
  cleanups.push(() => stories.close())
  const { stop } = await createMarkdownFilesWatcher(ctx)
  cleanups.push(stop)
}

// By its end: chokidar reports a relative path with the platform's separator.
const markdownFile = (name: string) => ctx.markdownFiles.find(file => file.absolutePath.endsWith(`/${name}`))
const html = (name: string) => markdownFile(name)?.html

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

  async function transform(code: string, id: string) {
    vi.spyOn(process, 'cwd').mockReturnValue(join(dir, 'book'))
    ctx = await createContext({ mode: 'dev' })
    const [plugin] = await createMarkdownPlugins(ctx)
    return (plugin!.transform as (code: string, id: string) => string | undefined)(code, id)
  }

  it.each(['lang.docs', 'lang.md'])('loads a file through `src`, with %s', async (lang) => {
    const code = '---\ntitle: Not this\n---\n# From the README\n\n[License](./LICENSE)\n'
    const file = write('book/README.md', code)

    const result = await transform(code, `${file}?vue&type=docs&index=0&src=true&${lang}`)

    expect(result).toContain('From the README')
    expect(result).toContain('./LICENSE')
    expect(result).not.toContain('Not this')
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
