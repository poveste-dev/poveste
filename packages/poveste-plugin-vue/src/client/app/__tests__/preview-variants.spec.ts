import type { Story as StoryData, Variant as VariantData } from '@poveste/shared'
import type { Component } from 'vue'
import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, reactive } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { provideRenderContext } from '../render-context.js'
import Story from '../Story.js'
import Variant from '../Variant.js'

const COUNT = 50

function storyData(): StoryData {
  const variants = Array.from({ length: COUNT }, (_, i) => ({ id: `v${i + 1}`, title: `Variant ${i + 1}`, state: {} })) as VariantData[]
  // `hasVariantChildComponents` is what every explicit <Variant> sets as it renders,
  // so this is the story as a retarget finds it: past its first render.
  return reactive({ id: 'grid', title: 'Grid', variants, meta: { hasVariantChildComponents: true } }) as unknown as StoryData
}

/** Renders `storyComponent` for `target` in a render context, and counts the Variant components created. */
async function renderPreview(storyComponent: Component, story: StoryData, target: string) {
  let variantsCreated = 0
  const currentVariant = story.variants.find(variant => variant.id === target) ?? null
  const app = createSSRApp(defineComponent({
    setup() {
      provideRenderContext(reactive({ mode: 'render', slotName: 'default', currentVariant, externalState: {}, nextVariantIndex: { value: 0 } }))
      return () => h(storyComponent, { story })
    },
  }))
  app.mixin({
    beforeCreate() {
      if (this.$options.name === 'Variant') {
        variantsCreated++
      }
    },
  })
  const html = await renderToString(app)
  return { html, variantsCreated }
}

const button = (n: number) => h('button', `Button ${n}`)

describe('a preview render of one variant', () => {
  // #873: gated on `hasVariantChildComponents`, the filter below never ran after a
  // story's first render, and every retarget rendered all N Variant components.
  it('creates only the target Variant when every variant is a direct child', async () => {
    const DirectStory = defineComponent({
      props: { story: { type: Object, required: true } },
      setup: props => () => h(Story, { story: props.story }, {
        default: () => Array.from({ length: COUNT }, (_, i) => h(Variant, { key: i }, { default: () => button(i + 1) })),
      }),
    })

    const { html, variantsCreated } = await renderPreview(DirectStory, storyData(), 'v37')

    expect(variantsCreated).toBe(1)
    expect(html).toContain('Button 37')
    expect(html).not.toContain('Button 36<')
  })

  // A walk of the slot's vnodes cannot see a <Variant> inside a child component,
  // so positions would not line up with `story.variants`, and every one renders.
  it('still renders every Variant when they live in a child component', async () => {
    const Rows = defineComponent({
      setup: () => () => Array.from({ length: COUNT }, (_, i) => h(Variant, { key: i }, { default: () => button(i + 1) })),
    })
    const WrappedStory = defineComponent({
      props: { story: { type: Object, required: true } },
      setup: props => () => h(Story, { story: props.story }, { default: () => h(Rows) }),
    })

    const { html, variantsCreated } = await renderPreview(WrappedStory, storyData(), 'v37')

    expect(variantsCreated).toBe(COUNT)
    expect(html).toContain('Button 37')
  })
})
