import { nextTick as bundledNextTick, reactive as bundledReactive } from '@poveste/vendors/vue'
import { describe, expect, it } from 'vitest'
import { createApp, createSSRApp, defineComponent, h, nextTick, reactive, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { implicitStateContext } from '../context.js'
import { provideRenderContext } from '../render-context.js'
import Story from '../Story.js'
import { holdsVueApp, syncStateBundledAndExternal } from '../util.js'

async function settle() {
  for (let i = 0; i < 6; i++) {
    await nextTick()
    await bundledNextTick()
  }
}

// A Vue app whose config counts every read of an enumerable key, which is what a
// deep watch walking into it does.
function countedApp() {
  const app = createApp({})
  const reads = { count: 0 }
  Object.defineProperty(app.config, 'probe', { enumerable: true, get: () => ++reads.count })
  return { app, reads }
}

/** Renders a story whose setup returns `bindings`, and hands back its implicit state. */
async function implicitStateOf(bindings: () => Record<string, unknown>) {
  let implicitState: (() => any) | null = null
  const Probe = defineComponent({
    setup() {
      implicitState = implicitStateContext.injectOptional()
      return () => null
    },
  })
  const StoryComponent = defineComponent({
    setup: () => bindings(),
    render: () => h(Story, { story: reactive({ id: 'story', title: 'Story', variants: [] }) }, { default: () => h(Probe) }),
  })
  await renderToString(createSSRApp(defineComponent({
    setup() {
      provideRenderContext(reactive({ mode: 'render', slotName: 'default', currentVariant: null, externalState: {}, nextVariantIndex: { value: 0 } }))
      return () => h(StoryComponent)
    },
  })))
  return implicitState!()
}

describe('holdsVueApp', () => {
  it('finds a Vue app, and one held in a data property, as the Nuxt app holds it', () => {
    expect(holdsVueApp(createApp({}))).toBe(true)
    expect(holdsVueApp({ vueApp: createApp({}), $greeting: 'hello' })).toBe(true)
  })

  it('runs no getter to find out', () => {
    let read = false
    const value = Object.defineProperty({}, 'app', {
      enumerable: true,
      get: () => {
        read = true
        return createApp({})
      },
    })

    expect(holdsVueApp(value)).toBe(false)
    expect(read).toBe(false)
  })

  it('leaves ordinary state alone', () => {
    expect(holdsVueApp({ label: 'text', nested: { mount: 'not an app' } })).toBe(false)
    expect(holdsVueApp('text')).toBe(false)
    expect(holdsVueApp(null)).toBe(false)
  })
})

describe('a story\'s implicit state', () => {
  it('keeps a plain object and a ref, and skips a binding that holds a Vue app', async () => {
    const { app } = countedApp()
    const state = await implicitStateOf(() => ({ settings: reactive({ size: 1 }), label: ref('a'), nuxtApp: { vueApp: app } }))

    expect(Object.keys(state)).toEqual(expect.arrayContaining(['label', 'settings']))
    expect(Object.keys(state)).not.toContain('nuxtApp')
  })

  // The sync deep-watches implicit state; holding the app, it walked into its config (#1457).
  it('syncs a plain object both ways, without reading anything on the app', async () => {
    const { app, reads } = countedApp()
    const state = await implicitStateOf(() => ({ settings: reactive({ size: 1 }), nuxtApp: { vueApp: app } }))
    const bundled = bundledReactive<Record<string, any>>({})
    const sync = syncStateBundledAndExternal(bundled, state)
    await settle()

    expect(bundled.settings).toEqual({ size: 1 })

    bundled.settings.size = 2
    await settle()
    expect(state.settings.size).toBe(2)

    state.settings.size = 3
    await settle()
    expect(bundled.settings.size).toBe(3)

    expect(reads.count).toBe(0)
    sync.stop()
  })
})
