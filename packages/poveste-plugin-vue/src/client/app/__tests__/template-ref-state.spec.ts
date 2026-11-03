// @vitest-environment jsdom
import { nextTick as bundledNextTick, reactive as bundledReactive } from '@poveste/vendors/vue'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, reactive, ref, shallowRef } from 'vue'
import { implicitStateContext } from '../context.js'
import { provideRenderContext } from '../render-context.js'
import Story from '../Story.js'
import { syncStateBundledAndExternal } from '../util.js'

async function settle() {
  for (let i = 0; i < 6; i++) {
    await nextTick()
    await bundledNextTick()
  }
}

/** Mounts a story with a template ref, and hands back its implicit state. */
async function mountStory() {
  const el = ref<HTMLElement | null>(null)
  const list = ref<HTMLElement[]>([])
  const child = ref<unknown>(null)
  const label = ref('alpha')
  const shown = ref(true)
  let implicitState: (() => any) | null = null

  const Probe = defineComponent({
    setup() {
      implicitState = implicitStateContext.injectOptional()
      return () => null
    },
  })
  const StoryComponent = defineComponent({
    setup: () => ({ el, list, child, label }),
    render: () => [
      shown.value ? h('div', { ref: el, ref_key: 'el', class: 'box' }) : null,
      h('div', { ref: list, ref_key: 'list', ref_for: true, class: 'item' }),
      h(Child, { ref: child, ref_key: 'child' }),
      h(Story, { story: reactive({ id: 'story', title: 'Story', variants: [] }) }, { default: () => h(Probe) }),
    ],
  })

  const root = document.createElement('div')
  const app = createApp(defineComponent({
    setup() {
      provideRenderContext(reactive({ mode: 'render', slotName: 'default', currentVariant: null, externalState: {}, nextVariantIndex: { value: 0 } }) as any)
      return () => h(StoryComponent)
    },
  }))
  app.mount(root)
  mounted.push(app)
  await settle()

  return { el, list, child, label, shown, root, state: implicitState!() }
}

const Child = defineComponent({ render: () => h('span') })

const mounted: ReturnType<typeof createApp>[] = []

afterEach(() => {
  mounted.splice(0).forEach(app => app.unmount())
})

describe('a story\'s implicit state and a template ref', () => {
  it('keeps the element when the state writes null over it', async () => {
    const { el, root, state } = await mountStory()

    state.el = null

    expect(el.value).toBe(root.querySelector('.box'))
  })

  it('reads as the value from before mount, so no element enters the state', async () => {
    const { state } = await mountStory()

    expect(state.el).toBeNull()
  })

  it('keeps the element through a sync with a variant that holds null', async () => {
    const { el, root, state } = await mountStory()
    const variantState = bundledReactive<Record<string, any>>({ el: null, label: 'alpha' })

    const sync = syncStateBundledAndExternal(variantState, state)
    await settle()

    expect(el.value).toBe(root.querySelector('.box'))
    expect(variantState.el).toBeNull()
    sync.stop()
  })

  it('keeps the elements of a `v-for` ref', async () => {
    const { list, root, state } = await mountStory()

    state.list = []

    expect(list.value).toEqual([root.querySelector('.item')])
  })

  it('reads a `v-for` ref as the array from before mount', async () => {
    const { state } = await mountStory()

    expect(state.list).toEqual([])
  })

  it('still writes an array of ordinary values', async () => {
    const tags = ref(['a'])
    const { state } = await mountStoryWith({ tags })

    state.tags = ['b']

    expect(tags.value).toEqual(['b'])
  })

  it('keeps a component', async () => {
    const { child, state } = await mountStory()
    const instance = child.value

    state.child = null

    expect(instance).not.toBeNull()
    expect(child.value).toBe(instance)
  })

  it('follows the element when it leaves and comes back', async () => {
    const { el, root, shown } = await mountStory()

    shown.value = false
    await settle()
    expect(el.value).toBeNull()

    shown.value = true
    await settle()
    expect(el.value).toBe(root.querySelector('.box'))
  })

  it('still writes an ordinary binding', async () => {
    const { label, state } = await mountStory()

    state.label = 'beta'

    expect(label.value).toBe('beta')
  })

  it('still writes a ref that holds an element nothing set through a template ref', async () => {
    const element = document.createElement('section')
    const held = shallowRef<HTMLElement | null>(element)
    const { state } = await mountStoryWith({ held })

    state.held = null

    expect(held.value).toBeNull()
  })
})

async function mountStoryWith(bindings: Record<string, unknown>) {
  let implicitState: (() => any) | null = null
  const Probe = defineComponent({
    setup() {
      implicitState = implicitStateContext.injectOptional()
      return () => null
    },
  })
  const StoryComponent = defineComponent({
    setup: () => bindings,
    render: () => h(Story, { story: reactive({ id: 'story', title: 'Story', variants: [] }) }, { default: () => h(Probe) }),
  })
  const app = createApp(defineComponent({
    setup() {
      provideRenderContext(reactive({ mode: 'render', slotName: 'default', currentVariant: null, externalState: {}, nextVariantIndex: { value: 0 } }) as any)
      return () => h(StoryComponent)
    },
  }))
  app.mount(document.createElement('div'))
  mounted.push(app)
  await settle()
  return { state: implicitState!() }
}
