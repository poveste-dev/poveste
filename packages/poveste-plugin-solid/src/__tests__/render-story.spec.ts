// @vitest-environment jsdom
import type { Story, Variant } from '@poveste/shared'
import type { SolidStorySetupApi } from '../types'
import { createApp, nextTick, reactive } from '@poveste/vendors/vue'
import { createComponent, createEffect } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MountStory from '../client/MountStory'
import { NO_CONTROLS } from '../client/no-controls'
import RenderStory from '../client/RenderStory'

const hooks = vi.hoisted(() => ({ setupSolid: undefined as undefined | ((api: SolidStorySetupApi) => void) }))
vi.mock('virtual:$poveste-generated-global-setup', () => ({ setupSolid: undefined }))
vi.mock('virtual:$poveste-setup', () => ({
  get setupSolid() {
    return hooks.setupSolid
  },
}))

/** A Solid component without JSX: a node whose text tracks one read. */
function text(read: () => unknown, tag = 'span'): HTMLElement {
  const node = document.createElement(tag)
  createEffect(() => {
    node.textContent = String(read())
  })
  return node
}

function variantOf(render: (api: any) => any, state: Record<string, any> = {}): Variant {
  return reactive({ id: 'v', title: 'v', state, configReady: true, slots: () => ({ default: render, controls: undefined, source: undefined }) }) as Variant
}

const story = { id: 's', title: 's', variants: [] } as unknown as Story
let unmount: (() => void) | undefined

async function mount(variant: Variant): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(RenderStory, { story, variant })
  app.mount(host)
  unmount = () => app.unmount()
  await vi.waitFor(() => expect(host.querySelector('[data-story]')).not.toBeNull())
  return host
}

afterEach(() => {
  unmount?.()
  hooks.setupSolid = undefined
  document.body.innerHTML = ''
})

describe('rendering a Solid variant', () => {
  it('runs the setup hook before mounting, so its wrapper is there for the first render', async () => {
    const order: string[] = []
    hooks.setupSolid = ({ addWrapper }) => {
      order.push('setup')
      addWrapper(props => createComponent(() => {
        const frame = document.createElement('section')
        frame.dataset['wrapper'] = 'outer'
        frame.append(props.children as Node)
        return frame
      }, {}))
    }

    const host = await mount(variantOf(() => {
      order.push('render')
      const node = text(() => 'story')
      node.dataset['story'] = ''
      return node
    }))

    expect(order).toEqual(['setup', 'render'])
    expect(host.querySelector('[data-wrapper="outer"] > [data-story]')).not.toBeNull()
  })

  it('nests wrappers with the first added outermost, as plugin-vue does', async () => {
    const wrap = (name: string) => (props: { children: unknown }) => {
      const frame = document.createElement('section')
      frame.dataset['wrapper'] = name
      frame.append(props.children as Node)
      return frame
    }
    hooks.setupSolid = ({ addWrapper }) => {
      addWrapper(wrap('first'))
      addWrapper(wrap('second'))
    }

    const host = await mount(variantOf(() => {
      const node = text(() => 'story')
      node.dataset['story'] = ''
      return node
    }))

    expect(host.querySelector('[data-wrapper="first"] > [data-wrapper="second"] > [data-story]')).not.toBeNull()
  })

  it('carries a change from the panel to the story without rendering it again', async () => {
    let renders = 0
    const variant = variantOf(({ state }) => {
      renders++
      const node = text(() => state.count)
      node.dataset['story'] = ''
      return node
    }, { count: 1 })
    const host = await mount(variant)
    const node = host.querySelector('[data-story]')

    variant.state.count = 7
    await nextTick()

    expect(host.querySelector('[data-story]')?.textContent).toBe('7')
    expect(host.querySelector('[data-story]')).toBe(node)
    expect(renders).toBe(1)
  })

  it('carries a change from the story to the panel through setState', async () => {
    let set: ((key: string, value: number) => void) | undefined
    const variant = variantOf(({ state, setState }) => {
      set = setState
      const node = text(() => state.count)
      node.dataset['story'] = ''
      return node
    }, { count: 1 })
    await mount(variant)

    set!('count', 5)

    expect(variant.state.count).toBe(5)
  })
})

describe('the controls slot', () => {
  // The panel shows its presets toolbar only once a custom controls slot says it
  // is ready, and the explanation renders no element for the old guard to find.
  it('reports ready when it only explains why there are no controls', async () => {
    const variant = reactive({ id: 'v', title: 'v', state: {}, configReady: true, slots: () => ({ default: undefined, controls: NO_CONTROLS, source: undefined }) }) as Variant
    const ready = vi.fn()
    const host = document.createElement('div')
    const app = createApp(RenderStory, { story, variant, slotName: 'controls', onReady: ready })
    app.mount(host)
    unmount = () => app.unmount()

    await vi.waitFor(() => expect(ready).toHaveBeenCalled())
    expect(host.textContent).toContain('no controls yet')
  })
})

describe('a variant whose mount is interrupted or replaced', () => {
  it('renders nothing when it was unmounted while a setup hook awaited', async () => {
    let release!: () => void
    hooks.setupSolid = () => new Promise<void>((resolve) => {
      release = resolve
    })
    const rendered = vi.fn(() => document.createElement('span'))
    const host = document.createElement('div')
    const app = createApp(RenderStory, { story, variant: variantOf(rendered) })
    app.mount(host)
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))

    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.unmount()
    release()
    await new Promise(resolve => setTimeout(resolve))

    // It used to go on: a store and a deep watcher created for a component that
    // was gone, then `render` into the detached element, which threw and was
    // reported as the story's own error.
    expect(rendered).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('removes a key from the variant\'s state when the story deletes it', async () => {
    let set: ((key: string, value: unknown) => void) | undefined
    const variant = variantOf(({ state, setState }) => {
      set = setState
      const node = text(() => state.selected ?? 'none')
      node.dataset['story'] = ''
      return node
    }, { selected: 'a', _hPropDefs: [] })
    await mount(variant)

    set!('selected', undefined)

    expect(Object.hasOwn(variant.state, 'selected')).toBe(false)
    expect(Object.hasOwn(variant.state, '_hPropDefs')).toBe(true)
  })
})

describe('mounting a story\'s variants', () => {
  function storyWith(options: Record<string, unknown>) {
    return reactive({ id: 's', title: 's', file: { component: options }, variants: [{ id: 'v', title: 'v', state: {} }] }) as unknown as Story
  }

  it('still marks a variant ready when its initState throws, and reports it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mounted = storyWith({ variants: [{ title: 'v', render: () => null, initState: () => {
      throw new Error('fixture failed to load')
    } }] })
    const app = createApp(MountStory, { story: mounted })
    app.mount(document.createElement('div'))
    unmount = () => app.unmount()

    await vi.waitFor(() => expect(mounted.variants[0]!.configReady).toBe(true))
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'fixture failed to load' }))
    error.mockRestore()
  })

  it('leaves initState to the realm that owns the state', async () => {
    const mounted = storyWith({ variants: [{ title: 'v', render: () => null, initState: () => ({ count: 3 }) }] })
    const app = createApp(MountStory, { story: mounted, syncState: false })
    app.mount(document.createElement('div'))
    unmount = () => app.unmount()

    await vi.waitFor(() => expect(mounted.variants[0]!.configReady).toBe(true))
    expect(mounted.variants[0]!.state).toEqual({})
  })
})
