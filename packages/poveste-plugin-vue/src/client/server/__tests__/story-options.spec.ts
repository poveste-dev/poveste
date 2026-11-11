// @vitest-environment jsdom
import type { ServerStory } from '@poveste/shared'
import { describe, expect, it } from 'vitest'
import { createApp, h } from 'vue'
import Story from '../Story.js'
import Variant from '../Variant.js'

/** The story a `<Story>` reports, provided the way `run.ts` provides it. */
function collect(props: Record<string, unknown>): ServerStory | undefined {
  const stories: ServerStory[] = []
  const app = createApp({ render: () => h(Story, props, { default: () => h(Variant, { id: 'default', title: 'default' }) }) })
  app.provide(Symbol.for('poveste-server-add-story'), (story: ServerStory) => stories.push(story))
  app.mount(document.createElement('div'))
  app.unmount()
  return stories[0]
}

// The accessibility panel reads the rules a story turns off from the collected story.
describe('a story\'s a11y', () => {
  it('is collected with the story', () => {
    expect(collect({ id: 'checked', title: 'Checked', a11y: { disableRules: ['region'] } })).toMatchObject({ a11y: { disableRules: ['region'] } })
  })

  it('is left off a story that sets none', () => {
    expect(collect({ id: 'plain', title: 'Plain' })).not.toHaveProperty('a11y')
  })
})
