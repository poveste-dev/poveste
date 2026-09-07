import { describe, expect, it } from 'vitest'
import { ALLOWLIST, countMountPoints, problemsIn, withoutComments } from './check-preview-position.ts'

// The comment #604 left in App.vue explains the regression using the word
// `RouterView`. A check that greps the bare word fails on a correct tree,
// tripping over the explanation of the thing it is checking — so this is the
// case that has to hold, not an edge case.
describe('a comment mentioning RouterView', () => {
  it('is not counted as a mount point', () => {
    const source = `
      <template>
        <!--
          Each chrome used to be a branch carrying its own \`RouterView\`, so
          switching between them moved the routed view in the tree (#600).
        -->
        <RouterView class="flex-1" />
      </template>
    `

    expect(countMountPoints(source)).toBe(1)
  })

  it('is not counted when it is a block comment in script', () => {
    const source = `
      <script setup>
      /* The preview used to sit under a second <RouterView>, which is #596. */
      </script>
      <template><RouterView /></template>
    `

    expect(countMountPoints(source)).toBe(1)
  })

  it('is not counted when it is a line comment', () => {
    const source = `
      <script setup>
      // do not add a second <RouterView> here
      </script>
      <template><RouterView /></template>
    `

    expect(countMountPoints(source)).toBe(1)
  })
})

describe('counting mount points', () => {
  it('counts a self-closing tag', () => {
    expect(countMountPoints('<RouterView />')).toBe(1)
  })

  it('counts the kebab-case spelling', () => {
    expect(countMountPoints('<router-view></router-view>')).toBe(1)
  })

  it('counts a tag carrying attributes', () => {
    expect(countMountPoints('<RouterView class="flex-1 min-h-0" />')).toBe(1)
  })

  it('does not count a component whose name merely starts the same way', () => {
    expect(countMountPoints('<RouterViewport />')).toBe(0)
  })

  it('counts each of two sibling branches', () => {
    const source = `
      <template v-if="isMobile"><RouterView /></template>
      <template v-else><RouterView /></template>
    `

    expect(countMountPoints(source)).toBe(2)
  })
})

describe('withoutComments', () => {
  it('leaves a URL in a string intact', () => {
    expect(withoutComments('const u = "https://poveste.dev"')).toContain('https://poveste.dev')
  })
})

describe('problemsIn', () => {
  it('accepts exactly one mount point across the package', () => {
    const files = [
      { file: 'a/App.vue', source: '<RouterView />' },
      { file: 'a/Other.vue', source: '<div />' },
    ]

    expect(problemsIn(files)).toEqual([])
  })

  // The shape of #596 and #600: a layout choice expressed as sibling branches
  // that both carry the routed view. App.vue held 3 before #596 and 2 before
  // #600, and each flip rebuilt the preview under a cold sandbox.
  it('names the file when one component mounts it twice', () => {
    const files = [{ file: 'a/App.vue', source: '<RouterView /><RouterView />' }]

    expect(problemsIn(files)).toEqual(['a/App.vue mounts the routed view 2 times'])
  })

  it('names both files when the second mount point is elsewhere', () => {
    const files = [
      { file: 'a/App.vue', source: '<RouterView />' },
      { file: 'a/Mobile.vue', source: '<RouterView />' },
    ]

    expect(problemsIn(files)).toEqual([
      'a/App.vue mounts the routed view 1 time',
      'a/Mobile.vue mounts the routed view 1 time',
    ])
  })

  // A check that silently stops matching is worse than no check, which is the
  // failure `check-bundle-size.ts` guards against by treating an unmatched
  // prefix as a problem rather than as nothing to do.
  it('fails when it finds no mount point at all', () => {
    expect(problemsIn([{ file: 'a/App.vue', source: '<div />' }]))
      .toEqual(['no <RouterView> found — either it moved, or this check stopped matching'])
  })

  it('starts with an empty allowlist, so every entry is an argued one', () => {
    expect(ALLOWLIST).toEqual([])
  })
})
