import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { addStoryContext, addVariantContext, collectStoryContext } from '../contexts.js'
import Story from './Story.svelte'
import Variant from './Variant.svelte'

function collect(props: Record<string, unknown>) {
  const stories: Array<Record<string, unknown>> = []
  // Read through `.body`: Svelte 5 renders lazily, and nothing runs before it.
  void render(Story as any, { props, context: new Map([[addStoryContext.key, (story: Record<string, unknown>) => stories.push(story)]]) }).body
  return stories[0]
}

function collectVariant(props: Record<string, unknown>) {
  const variants: Array<Record<string, unknown>> = []
  const context = new Map<unknown, unknown>([
    [collectStoryContext.key, { id: 'story', variants }],
    [addVariantContext.key, (variant: Record<string, unknown>) => variants.push(variant)],
  ])
  void render(Variant as any, { props, context }).body
  return variants[0]
}

// The collector listed the props it took and `meta` was not one, so a story's
// `meta.storyOptions` did nothing in a Svelte book (#1206).
describe('a story\'s meta', () => {
  it('is collected with the story', () => {
    expect(collect({ id: 'options', title: 'Options', meta: { storyOptions: false } })).toMatchObject({ meta: { storyOptions: false } })
  })

  it('is left off a story that sets none', () => {
    expect(collect({ id: 'plain', title: 'Plain' })).not.toHaveProperty('meta')
  })
})

// The same list on `<Variant>`, with the same gap (#1260). Nothing built in reads
// a variant's `meta` yet: `VariantMeta` has no keys of its own, so this is what a
// plugin or a book's own code finds on the collected variant.
describe('a variant\'s meta', () => {
  it('is collected with the variant', () => {
    expect(collectVariant({ title: 'Primary', meta: { owner: 'design' } })).toMatchObject({ meta: { owner: 'design' } })
  })

  it('is left off a variant that sets none', () => {
    expect(collectVariant({ title: 'Primary' })).not.toHaveProperty('meta')
  })
})
