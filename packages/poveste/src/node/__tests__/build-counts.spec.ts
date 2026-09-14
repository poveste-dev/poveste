import type { ServerStoryFile } from '@poveste/shared'
import { describe, expect, it } from 'vitest'
import { buildCounts, buildSummary, builtSomething } from '../build-counts.js'

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

describe('builtSomething', () => {
  it('is true of a book with stories in it', () => {
    expect(builtSomething({ stories: 3, variants: 7, docs: 0, empty: [] })).toBe(true)
  })

  it('is true of a book of documents alone', () => {
    expect(builtSomething({ stories: 0, variants: 0, docs: 4, empty: [] })).toBe(true)
  })

  // The case the colour in build.ts turns on: files were found, nothing was
  // built out of them.
  it('is false when every story file found was empty', () => {
    expect(builtSomething({ stories: 0, variants: 0, docs: 0, empty: ['src/Demo.story.vue'] })).toBe(false)
  })
})

describe('buildSummary', () => {
  it('reports what it built on one green line', () => {
    expect(buildSummary({ stories: 3, variants: 7, docs: 0, empty: [] }, 1.2, ['**/*.story.vue'])).toEqual([
      '✅ Built 3 stories (7 variants) in 1.2s',
    ])
  })

  it('counts documents alongside stories', () => {
    expect(buildSummary({ stories: 3, variants: 7, docs: 2, empty: [] }, 1.2, ['**/*.story.vue'])).toEqual([
      '✅ Built 3 stories (7 variants) and 2 documents in 1.2s',
    ])
  })

  // A book of markdown pages has content, and telling its author nothing was
  // found would be wrong.
  it('treats a book of documents alone as something built', () => {
    expect(buildSummary({ stories: 0, variants: 0, docs: 4, empty: [] }, 0.5, ['**/*.story.md'])).toEqual([
      '✅ Built 0 stories (0 variants) and 4 documents in 0.5s',
    ])
  })

  it('keeps the singulars readable', () => {
    expect(buildSummary({ stories: 1, variants: 1, docs: 1, empty: [] }, 0.3, ['x'])).toEqual([
      '✅ Built 1 story (1 variant) and 1 document in 0.3s',
    ])
  })

  // The defect. `✅ Built 0 stories (0 variants)` is true of a working build in
  // a project with nothing to build, and it is what the first command in the
  // guide prints for a reader who has not written a story yet (#624).
  describe('when no file matched at all', () => {
    const nothing = { stories: 0, variants: 0, docs: 0, empty: [] }

    it('says where it looked instead of ticking', () => {
      expect(buildSummary(nothing, 0.4, ['**/*.story.vue', '**/*.story.md'])).toEqual([
        'Built 0 stories in 0.4s — nothing matched **/*.story.vue, **/*.story.md',
        'Write a story file and run this again: https://poveste.dev/guide/',
      ])
    })

    it('does not tick', () => {
      expect(buildSummary(nothing, 0.4, ['**/*.story.vue']).join('\n')).not.toContain('✅')
    })
  })

  // The likelier path, and the one the first attempt at #624 got wrong: the
  // reader followed the guide, made the file, and has not put a <Story> in it.
  // Those files matched the globs, and the build warns about them by name on
  // the line directly above this one.
  describe('when the only files it found produced no story', () => {
    const empty = { stories: 0, variants: 0, docs: 0, empty: ['src/Demo.story.vue'] }

    it('says the files matched, rather than that nothing did', () => {
      expect(buildSummary(empty, 0.4, ['**/*.story.vue'])).toEqual([
        'Built 0 stories in 0.4s — 1 file matched **/*.story.vue and produced no story',
        'A story file needs a <Story> in it: https://poveste.dev/guide/',
      ])
    })

    it('does not ask for a file the reader has already written', () => {
      expect(buildSummary(empty, 0.4, ['**/*.story.vue']).join('\n')).not.toContain('Write a story file')
    })

    it('counts the files it is talking about', () => {
      const two = { ...empty, empty: ['src/Demo.story.vue', 'src/Other.story.vue'] }

      expect(buildSummary(two, 0.4, ['**/*.story.vue'])[0]).toContain('2 files matched')
    })

    it('does not tick', () => {
      expect(buildSummary(empty, 0.4, ['**/*.story.vue']).join('\n')).not.toContain('✅')
    })
  })
})
