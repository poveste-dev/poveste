import type { Context } from '../context.js'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createMarkdownFilesWatcher } from '../markdown.js'
import { watchStories } from '../stories.js'

// Two docs that link to each other's story. The dev server starts the markdown
// watcher once `watchStories` resolves, and a story its scan had not reached by
// then left the link to it throwing, about one start in five (#1479).
describe('docs that link to each other\'s story', () => {
  vi.spyOn(process, 'cwd').mockReturnValue(path.resolve(__dirname, './markdown-linked'))

  let ctx: Context
  let storyWatcher: Awaited<ReturnType<typeof watchStories>> | undefined

  beforeEach(async () => {
    ctx = await createContext({ mode: 'dev' })
    ctx.config.supportMatch = [{ id: 'vue', patterns: ['**/*.vue'], pluginIds: ['vue'] }]
  })

  afterEach(async () => {
    await storyWatcher?.close()
  })

  it('have every story collected once the story watcher starts', async () => {
    storyWatcher = await watchStories(ctx)

    expect(ctx.storyFiles.map(file => file.fileName).sort()).toEqual(['Badge', 'Tag'])
  })

  it('link to the story beside each doc', async () => {
    storyWatcher = await watchStories(ctx)

    const { stop } = await createMarkdownFilesWatcher(ctx)
    await stop()

    const badge = ctx.markdownFiles.find(file => file.relativePath === 'Badge.story.md')
    expect(badge?.storyFile?.fileName).toBe('Badge')
    expect(badge?.html).toContain(`href="/story/${ctx.storyFiles.find(file => file.fileName === 'Tag')!.id}"`)
  })
})
