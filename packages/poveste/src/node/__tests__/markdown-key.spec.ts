import type { Context } from '../context.js'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../context.js'
import { createMarkdownFilesWatcher } from '../markdown.js'
import { watchStories } from '../stories.js'

let dir: string
const cleanups: (() => Promise<unknown> | unknown)[] = []

function write(file: string, text: string) {
  const path = join(dir, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

async function openBook(): Promise<Context> {
  vi.spyOn(process, 'cwd').mockReturnValue(dir)
  const ctx = await createContext({ mode: 'build' })
  ctx.config.supportMatch = [{ id: 'vue', patterns: ['**/*.vue', '**/*.js'], pluginIds: ['vue'] }]
  const stories = await watchStories(ctx)
  cleanups.push(() => stories.close())
  const { stop } = await createMarkdownFilesWatcher(ctx)
  cleanups.push(stop)
  return ctx
}

// Chokidar reports a relative path with the platform's separator, and the client asks
// for a story's docs by a forward-slash one, so only Windows can tell these apart (#1625).
describe('the key a story\'s markdown is listed under', () => {
  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'poveste-md-key-')))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    for (const cleanup of cleanups.splice(0)) {
      await cleanup()
    }
    rmSync(dir, { recursive: true, force: true })
  })

  it('is what the client looks up, for a sibling `.story.md` in a subfolder', async () => {
    write('pages/Tag.story.vue', '')
    write('pages/Tag.story.md', '# Tag')

    const ctx = await openBook()
    const story = ctx.storyFiles.find(file => file.path.endsWith('Tag.story.vue'))!

    // What `useStoryDoc` in `StoryDocs.vue` asks for.
    const lookup = story.relativePath.replace(/\.(\w*)$/, '.md')
    expect(ctx.markdownFiles.map(file => file.relativePath)).toContain(lookup)
    expect(story.markdownFile?.relativePath).toBe(lookup)
  })

  it('is what the client looks up, for a standalone `.story.md` in a subfolder', async () => {
    write('pages/Guide.story.md', '# Guide')

    const ctx = await openBook()
    const story = ctx.storyFiles.find(file => file.markdownFile)!

    const lookup = story.relativePath.replace(/\.(\w*)$/, '.md')
    expect(ctx.markdownFiles.map(file => file.relativePath)).toContain(lookup)
  })
})
