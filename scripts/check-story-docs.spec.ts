import { describe, expect, it } from 'vitest'
import { undocumentedInSomeBooks } from './check-story-docs.ts'

describe('stories documented in some books and not others', () => {
  it('names the book that is missing the companion', () => {
    expect(undocumentedInSomeBooks({
      vue3: ['Meow.story.vue', 'Meow.story.md'],
      svelte5: ['Meow.story.svelte'],
    })).toEqual(['Meow.story.md is in vue3 but not in svelte5'])
  })

  it('says nothing when every book carrying the story documents it', () => {
    expect(undocumentedInSomeBooks({
      vue3: ['Meow.story.vue', 'Meow.story.md'],
      svelte5: ['Meow.story.svelte', 'Meow.story.md'],
    })).toEqual([])
  })

  it('says nothing about a story no book documents', () => {
    expect(undocumentedInSomeBooks({
      vue3: ['Button.story.vue'],
      svelte5: ['Button.story.svelte'],
    })).toEqual([])
  })

  // A `.story.md` with no story beside it is a docs-only page, and a book is
  // free not to carry one.
  it('says nothing about a docs-only page', () => {
    expect(undocumentedInSomeBooks({
      vue3: ['Introduction.story.md'],
      svelte5: [],
    })).toEqual([])
  })

  // `Introduction` really is both in this repo, and the name they share is not
  // evidence that either book is missing anything.
  it('says nothing when a name is a page in one book and a story in another', () => {
    expect(undocumentedInSomeBooks({
      vue3: ['Introduction.story.vue'],
      svelte5: ['Introduction.story.md'],
    })).toEqual([])
  })

  it('reports each book that is missing it', () => {
    expect(undocumentedInSomeBooks({
      vue3: ['Meow.story.vue', 'Meow.story.md'],
      nuxt4: ['Meow.story.vue', 'Meow.story.md'],
      svelte5: ['Meow.story.svelte'],
      sveltekit: ['Meow.story.svelte'],
    })).toEqual([
      'Meow.story.md is in nuxt4, vue3 but not in svelte5',
      'Meow.story.md is in nuxt4, vue3 but not in sveltekit',
    ])
  })
})
