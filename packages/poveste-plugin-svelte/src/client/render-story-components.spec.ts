import { render } from 'svelte/server'
import { describe, expect, it, vi } from 'vitest'
import ManyVariants from '../__fixtures__/ManyVariants.svelte'
import { renderStoryComponents } from './render-story-components'

const created = vi.hoisted(() => ({ count: 0 }))

vi.mock('./RenderVariant.svelte', async (importOriginal) => {
  const RenderVariant = (await importOriginal<{ default: (...args: unknown[]) => unknown }>()).default
  return {
    default: (...args: unknown[]) => {
      created.count++
      return RenderVariant(...args)
    },
  }
})

function storyOf(count: number) {
  return {
    id: 'many-variants',
    title: 'Many variants',
    variants: Array.from({ length: count }, (_, i) => ({ id: `v${i + 1}`, title: `Variant ${i + 1}`, state: {} })),
  } as any
}

function renderShowing(story: any, variant: any, Hst = renderStoryComponents(story, variant)) {
  const context = new Map<string, unknown>([['__pvtStory', story], ['__pvtVariant', variant], ['__pvtSlot', 'default']])
  return render(ManyVariants as any, { props: { Hst, count: story.variants.length }, context }).body
}

describe('rendering a story that shows one of its variants', () => {
  it('creates a RenderVariant for that variant alone', () => {
    const story = storyOf(50)
    created.count = 0

    const html = renderShowing(story, story.variants[36])

    expect(created.count).toBe(1)
    expect(html).toContain('Button 37')
    expect(html).not.toMatch(/Button (?!37\b)\d+/)
  })

  it('shows the same variant when the story runs again with the same components, as a hot update does', () => {
    const story = storyOf(50)
    const Hst = renderStoryComponents(story, story.variants[4])

    renderShowing(story, story.variants[4], Hst)
    const html = renderShowing(story, story.variants[4], Hst)

    expect(html).toContain('Button 5')
  })
})
