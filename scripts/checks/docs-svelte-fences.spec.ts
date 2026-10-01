import { describe, expect, it } from 'vitest'
import { checkDocsSvelteFences, fenceProblems, fencesIn, markdownFiles } from './docs-svelte-fences.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const STORY = `<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  const { Hst }: { Hst: HstType } = $props()
</script>

<Hst.Story title="MyStory" />
`

// The defect: the type import and the prop are two declarations of one name.
const COLLIDING = STORY.replace('Hst as HstType', 'Hst').replace('Hst: HstType', 'Hst: Hst')

// What #1061 was: every Svelte example declared the prop this way, and a project
// from the current `sv create` cannot compile it.
const LEGACY = `<script>
  export let Hst
</script>

<Hst.Story title="MyStory" />
`

describe('a fence a reader would copy', () => {
  it('passes when it compiles', () => {
    expect(fenceProblems([{ file: 'docs/guide/svelte/stories.md', index: 1, source: STORY }])).toEqual([])
  })

  it('fails, naming the page and which fence, when it does not', () => {
    expect(fenceProblems([{ file: 'docs/guide/svelte/stories.md', index: 3, source: COLLIDING }])).toEqual([
      'docs/guide/svelte/stories.md fence 3 does not compile in runes mode: Identifier \'Hst\' has already been declared',
    ])
  })
})

/*
 * #1061. The reader's project is in runes mode because that is what the current
 * `sv create` writes, so a fence that only compiles in the permissive default is
 * one they cannot copy — and compiling in the default is what let every Svelte
 * example in the docs pass while none of them built.
 */
describe('a fence written the legacy way', () => {
  it('fails, and says it is the mode that rejected it', () => {
    expect(fenceProblems([{ file: 'docs/guide/svelte/stories.md', index: 1, source: LEGACY }])).toEqual([
      'docs/guide/svelte/stories.md fence 1 does not compile in runes mode: Cannot use `export let` in runes mode — use `$props()` instead',
    ])
  })

  it('is allowed when the fence says it is histoire\'s code, which is legacy by definition', () => {
    const marked = `<!-- histoire -->\n${LEGACY}`

    expect(fenceProblems([{ file: 'docs/guide/migration-from-histoire.md', index: 1, source: marked }])).toEqual([])
  })

  it('stops being allowed if the marker goes', () => {
    const marked = `<!-- histoire -->\n${LEGACY}`

    expect(fenceProblems([{ file: 'docs/guide/migration-from-histoire.md', index: 1, source: marked.replace('<!-- histoire -->\n', '') }]))
      .toHaveLength(1)
  })

  it('does not exempt the poveste half of the same page', () => {
    const paired = `<!-- poveste -->\n${LEGACY}`

    expect(fenceProblems([{ file: 'docs/guide/migration-from-histoire.md', index: 2, source: paired }])).toHaveLength(1)
  })
})

describe('finding the fences', () => {
  it('numbers them by position, so a message names the one that failed', () => {
    const markdown = ['# Page', '```svelte', '<p>one</p>', '```', 'prose', '```svelte', '<p>two</p>', '```'].join('\n')

    expect(fencesIn('docs/page.md', markdown).map(fence => fence.index)).toEqual([1, 2])
  })

  it('takes a fence that carries line highlighting, which is the same fence', () => {
    const markdown = ['```svelte{2-3}', '<p>one</p>', '```'].join('\n')

    expect(fencesIn('docs/page.md', markdown).map(fence => fence.source)).toEqual(['<p>one</p>\n'])
  })

  it('takes svelte fences alone, not every fence on the page', () => {
    const markdown = ['```ts', 'const a = 1', '```', '```svelte', '<p>one</p>', '```'].join('\n')

    expect(fencesIn('docs/page.md', markdown).map(fence => fence.source)).toEqual(['<p>one</p>\n'])
  })

  it('reads the pages, not the built site', () => {
    const root = tree({
      'docs/guide/page.md': '# Page',
      'docs/.vitepress/dist/guide/page.md': '# Built copy',
    })

    expect(markdownFiles(root)).toEqual(['docs/guide/page.md'])
  })
})

describe('checkDocsSvelteFences', () => {
  it('reports that it found no fence at all', () => {
    const root = tree({ 'docs/guide/page.md': '# Page with no fence' })

    expect(checkDocsSvelteFences(root).problems).toEqual(['no `svelte` fence under docs — this check is looking in the wrong place'])
  })

  it('every svelte fence in the docs compiles', { tags: ['check', 'docs'] }, () => {
    assertNoProblems(checkDocsSvelteFences())
  })
})
