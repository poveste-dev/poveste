import { render } from 'svelte/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ManyVariants from '../__fixtures__/ManyVariants.svelte'
import { slotNameContext, storyContext, variantContext } from '../contexts.js'
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

/** The variants the rendered story actually drew, in order. */
function variantsDrawn(html: string): string[] {
  return html.match(/Button \d+/g) ?? []
}

function renderWith(Hst: unknown, story: any, variant: any) {
  const context = new Map<symbol, unknown>([[storyContext.key, story], [variantContext.key, variant], [slotNameContext.key, 'default']])
  return render(ManyVariants as any, { props: { Hst, count: story.variants.length }, context }).body
}

function renderShowing(story: any, variant: any) {
  return renderWith(renderStoryComponents(story, variant), story, variant)
}

describe('rendering a story that shows one of its variants', () => {
  beforeEach(() => {
    created.count = 0
  })

  it('draws that variant alone', () => {
    const story = storyOf(50)

    const html = renderShowing(story, story.variants[36])

    expect(variantsDrawn(html)).toEqual(['Button 37'])
  })

  it('creates a RenderVariant for it alone', () => {
    const story = storyOf(50)

    renderShowing(story, story.variants[36])

    expect(created.count).toBe(1)
  })

  // A hot update runs the story again with the components it was given.
  it('draws it again when the story runs again with the same components', () => {
    const story = storyOf(50)
    const Hst = renderStoryComponents(story, story.variants[4])

    renderWith(Hst, story, story.variants[4])
    const html = renderWith(Hst, story, story.variants[4])

    expect(variantsDrawn(html)).toEqual(['Button 5'])
  })
})
