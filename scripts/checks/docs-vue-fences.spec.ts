import { describe, expect, it } from 'vitest'
import { checkDocsVueFences, fenceProblems, fencesIn, markdownFiles } from './docs-vue-fences.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const STORY = `<script lang="ts" setup>
import MyButton from './MyButton.vue'

const state = reactive({ label: 'Click me' })
</script>

<template>
  <Story title="MyStory">
    <MyButton :label="state.label" />
  </Story>
</template>
`

// The kind of defect only `compileScript` sees: `parse` splits the blocks happily
// and never resolves the macro, so a parse-only check passes this.
const BAD_MACRO = STORY.replace('const state = reactive', 'const props = defineProps<Props>()\nconst state = reactive')

/** A `<template>` on its own is a component, and most reference pages are one. */
const TEMPLATE_ONLY = `<template>
  <Story title="MyStory" />
</template>
`

const FRAGMENT = `<Variant title="Naked">
  <MyButton />
</Variant>
`

describe('a fence a reader would copy', () => {
  it('passes when it compiles', () => {
    expect(fenceProblems([{ file: 'docs/guide/vue/stories.md', index: 1, source: STORY }])).toEqual([])
  })

  it('passes a template with no script, which is a whole component', () => {
    expect(fenceProblems([{ file: 'docs/reference/vue/story.md', index: 1, source: TEMPLATE_ONLY }])).toEqual([])
  })

  it('fails, naming the page and which fence, when it does not', () => {
    const problems = fenceProblems([{ file: 'docs/guide/vue/controls.md', index: 3, source: BAD_MACRO }])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^docs\/guide\/vue\/controls\.md fence 3 does not compile: /)
  })

  // What the three retagged fragments were, and why a ```vue fence is the wrong
  // home for one: it is not a component and cannot be compiled as one.
  it('rejects a bare element fragment, which is what the retag is for', () => {
    expect(fenceProblems([{ file: 'docs/guide/css.md', index: 1, source: FRAGMENT }])[0])
      .toMatch(/fragment rather than a component|missing end tag/)
  })
})

describe('finding the fences', () => {
  it('finds a plain fence', () => {
    expect(fencesIn('a.md', '```vue\n<template />\n```')).toEqual([
      { file: 'a.md', index: 1, source: '<template />\n' },
    ])
  })

  it('finds one carrying VitePress line highlighting', () => {
    expect(fencesIn('a.md', '```vue{2-3}\n<template />\n```')).toHaveLength(1)
  })

  // The whole point of the retag: `vue-html` must not be read as `vue`, or this
  // check fails on the fragments it exists to let through.
  it('leaves a `vue-html` fence alone', () => {
    expect(fencesIn('a.md', '```vue-html\n<MyButton />\n```')).toEqual([])
  })

  it('numbers them per file, so a message says which one', () => {
    const found = fencesIn('a.md', '```vue\n<template />\n```\n\ntext\n\n```vue\n<template />\n```')

    expect(found.map(fence => fence.index)).toEqual([1, 2])
  })
})

describe('the pages it reads', () => {
  it('skips build output and VitePress internals', () => {
    const root = tree({
      'docs/guide/a.md': '',
      'docs/.vitepress/config.js': '',
      'docs/dist/b.md': '',
      'docs/node_modules/c/d.md': '',
    })

    expect(markdownFiles(root)).toEqual(['docs/guide/a.md'])
  })
})

describe('the repository', () => {
  it('has every `vue` fence compiling', { tags: ['check', 'docs'] }, () => {
    assertNoProblems(checkDocsVueFences())
  })

  it('reports rather than passes when it finds no fence at all', () => {
    expect(checkDocsVueFences(tree({ 'docs/guide/a.md': 'no fences here' })).problems)
      .toContainEqual(expect.stringContaining('no `vue` fence under'))
  })
})
