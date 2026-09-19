import { describe, expect, it } from 'vitest'
import { checkDocsSvelteFences, fenceProblems, fencesIn, markdownFiles } from './docs-svelte-fences.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const STORY = `<script lang="ts">
  import type { Hst as HstType } from '@poveste/plugin-svelte'

  export let Hst: HstType
</script>

<Hst.Story title="MyStory" />
`

// The defect: the type import and the prop are two declarations of one name.
const COLLIDING = STORY.replace('Hst as HstType', 'Hst').replace('Hst: HstType', 'Hst: Hst')

describe('a fence a reader would copy', () => {
  it('passes when it compiles', () => {
    expect(fenceProblems([{ file: 'docs/guide/svelte/stories.md', index: 1, source: STORY }])).toEqual([])
  })

  it('fails, naming the page and which fence, when it does not', () => {
    expect(fenceProblems([{ file: 'docs/guide/svelte/stories.md', index: 3, source: COLLIDING }])).toEqual([
      'docs/guide/svelte/stories.md fence 3 does not compile: Identifier \'Hst\' has already been declared',
    ])
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
