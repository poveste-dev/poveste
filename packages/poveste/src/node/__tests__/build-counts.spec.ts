import type { ServerStoryFile } from '@poveste/shared'
import { describe, expect, it } from 'vitest'
import { buildCounts } from '../build-counts.js'

function storyFile(relativePath: string, story: unknown): ServerStoryFile {
  return { relativePath, story } as ServerStoryFile
}

/** A `.story.vue` with two variants. */
const NORMAL = storyFile('src/Button.story.vue', { variants: [{ id: 'a' }, { id: 'b' }] })

/** A standalone `.story.md`: no variants by construction, and that is the design. */
const DOCS_ONLY = storyFile('src/MarkdownFile.story.md', { docsOnly: true, variants: [] })

/** `Empty.story.vue`: a real story file with no story tag in it. */
const EMPTY = storyFile('src/components/Empty.story.vue', { variants: [] })

/** A file the collector produced no story for at all. */
const NO_STORY = storyFile('src/Broken.story.vue', undefined)

describe('buildCounts', () => {
  it('counts a story file with variants as a story', () => {
    expect(buildCounts([NORMAL])).toMatchObject({ stories: 1, variants: 2, docs: 0, empty: [] })
  })

  it('counts a documentation page as a document, not as a story and not as empty', () => {
    expect(buildCounts([DOCS_ONLY])).toMatchObject({ stories: 0, docs: 1, empty: [] })
  })

  it('reports no variants for a documentation page, which genuinely has none', () => {
    expect(buildCounts([DOCS_ONLY]).variants).toBe(0)
  })

  it('names a story file that has neither variants nor documentation', () => {
    expect(buildCounts([EMPTY]).empty).toEqual(['src/components/Empty.story.vue'])
  })

  it('names a file the collector produced no story for', () => {
    expect(buildCounts([NO_STORY]).empty).toEqual(['src/Broken.story.vue'])
  })

  describe('over a book that mixes all three, which is every reference book', () => {
    // examples/vue3 in miniature: many stories, three docs pages, one Empty fixture.
    const book = [NORMAL, DOCS_ONLY, DOCS_ONLY, DOCS_ONLY, EMPTY]

    it('keeps documents out of the story count, as the home page does', () => {
      expect(buildCounts(book)).toMatchObject({ stories: 1, docs: 3 })
    })

    it('warns about the one genuinely empty file and names it', () => {
      expect(buildCounts(book).empty).toEqual(['src/components/Empty.story.vue'])
    })

    it('accounts for every story file exactly once', () => {
      const { stories, docs, empty } = buildCounts(book)

      expect(stories + docs + empty.length).toBe(book.length)
    })
  })
})
