import type { Context } from '../context.js'
import { createWriteStream, unlinkSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createMarkdownFilesWatcher, createMarkdownRenderer } from '../markdown.js'
import { watchStories } from '../stories.js'

describe('markdown', async () => {
  vi.spyOn(process, 'cwd').mockReturnValue(path.resolve(__dirname, './markdown'))

  let ctx: Context
  let storyWatcher: Awaited<ReturnType<typeof watchStories>>

  beforeEach(async () => {
    ctx = await createContext({
      mode: 'dev',
    })

    // create watch stories to set context root etc.
    storyWatcher = await watchStories(ctx)
  })

  afterEach(() => {
    storyWatcher.close()
  })

  it('should not throw error or depend on - resolve order for linking', async () => {
    // FileWatcher should pickup the test markdown files (test1 and test2)
    // test1 links to test2 (issue previously as test1 resolved first)
    // test 2 links to test1
    const { stop } = await createMarkdownFilesWatcher(ctx)
    expect(ctx.markdownFiles.length).toEqual(2)
    stop()
  })

  it('should render html from md', async () => {
    const { stop } = await createMarkdownFilesWatcher(ctx)
    expect(ctx.markdownFiles[0].html).toContain('<p>')
    stop()
  })

  it('links a bare domain and renders emoji shortcodes', async () => {
    // markdown-it 15 turned fuzzy links off by default, and markdown-it-emoji
    // 3.0 threw on it; docs written before either still expect both.
    const md = await createMarkdownRenderer(ctx)

    const html = md.render('Visit www.example.com :tada:', { file: path.resolve(__dirname, './markdown/test1.story.md') })

    expect(html).toContain('<a href="http://www.example.com" target="_blank">www.example.com</a>')
    expect(html).toContain('🎉')
  })

  it('puts a fenced block\'s attributes on its code element', async () => {
    const md = await createMarkdownRenderer(ctx)

    const html = md.render('```js {.wide data-demo=1}\nconst a = 1\n```\n', { file: path.resolve(__dirname, './markdown/test1.story.md') })

    expect(html).toContain('<pre><code class="wide language-js" data-demo="1">')
  })

  it('should throw error on missing [md] story file.', async () => {
    const testFile3 = '/markdown/test3.story.md'
    const writer = createWriteStream(__dirname.concat(testFile3))
    // link to missing file.
    writer.write(
      '<!-- File should link to test1 file. -->\n'
      + '# Test3\n\n'
      + 'Link to test 4\n'
      + '[TEST](./test4.story.md)\n',
    )
    writer.end()
    await new Promise(resolve => writer.on('finish', resolve))

    // create markdownWatcher and check for error
    await expect(async () => createMarkdownFilesWatcher(ctx)).rejects.toThrowError()
    // delete test file, so failures are removed as well.
    unlinkSync(__dirname.concat(testFile3))
  })
})
