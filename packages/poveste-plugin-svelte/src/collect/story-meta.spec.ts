import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { addStoryContext } from '../contexts.js'
import Story from './Story.svelte'

function collect(props: Record<string, unknown>) {
  const stories: Array<Record<string, unknown>> = []
  // Read through `.body`: Svelte 5 renders lazily, and nothing runs before it.
  void render(Story as any, { props, context: new Map([[addStoryContext.key, (story: Record<string, unknown>) => stories.push(story)]]) }).body
  return stories[0]
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
