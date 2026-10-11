// @vitest-environment jsdom
import type { Story, Variant } from '@poveste/shared'
import type { ReactNode } from 'react'
import type { ReactRenderApi, ReactStorySetupApi } from '../types'
import { createApp, nextTick, reactive } from '@poveste/vendors/vue'
import { createElement, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MountStory from '../client/MountStory'
import { NO_CONTROLS } from '../client/no-controls'
import RenderStory from '../client/RenderStory'

const hooks = vi.hoisted(() => ({ setupReact: undefined as undefined | ((api: ReactStorySetupApi) => unknown) }))
vi.mock('virtual:$poveste-generated-global-setup', () => ({ setupReact: undefined }))
vi.mock('virtual:$poveste-setup', () => ({
  get setupReact() {
    return hooks.setupReact
  },
}))

type Render = (api: ReactRenderApi<any>) => ReactNode

function variantOf(render: Render, state: Record<string, any> = {}): Variant {
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

const storyText = (host: HTMLElement) => host.querySelector('[data-story]')?.textContent

afterEach(() => {
  unmount?.()
  unmount = undefined
  hooks.setupReact = undefined
  document.body.innerHTML = ''
})

describe('rendering a React variant', () => {
  it('runs the setup hook before mounting, so its wrapper is there for the first render', async () => {
    const order: string[] = []
    hooks.setupReact = ({ addWrapper }) => {
      order.push('setup')
      addWrapper(({ children }) => createElement('section', { 'data-wrapper': 'outer' }, children))
    }

    const host = await mount(variantOf(() => {
      order.push('render')
      return createElement('span', { 'data-story': '' }, 'story')
    }))

    expect(order).toEqual(['setup', 'render'])
    expect(host.querySelector('[data-wrapper="outer"] > [data-story]')).not.toBeNull()
  })

  it('nests wrappers with the first added outermost, as plugin-vue does', async () => {
    hooks.setupReact = ({ addWrapper }) => {
      addWrapper(({ children }) => createElement('section', { 'data-wrapper': 'first' }, children))
      addWrapper(({ children }) => createElement('section', { 'data-wrapper': 'second' }, children))
    }

    const host = await mount(variantOf(() => createElement('span', { 'data-story': '' }, 'story')))

    expect(host.querySelector('[data-wrapper="first"] > [data-wrapper="second"] > [data-story]')).not.toBeNull()
  })

  it('is in the DOM by the time it reports ready', async () => {
    const host = document.createElement('div')
    let renderedAtReady: string | null | undefined
    const app = createApp(RenderStory, {
      story,
      variant: variantOf(() => createElement('span', { 'data-story': '' }, 'story')),
      onReady: () => {
        renderedAtReady = host.querySelector('[data-story]')?.textContent
      },
    })
    app.mount(host)
    unmount = () => app.unmount()

    await vi.waitFor(() => expect(renderedAtReady).toBe('story'))
  })

  it('renders a change from the panel', async () => {
    const variant = variantOf(({ state }) => createElement('span', { 'data-story': '' }, state.count), { count: 1 })
    const host = await mount(variant)

    variant.state.count = 7
    await nextTick()

    await vi.waitFor(() => expect(storyText(host)).toBe('7'))
  })

  it('carries a change from the story to the panel, merging the keys it is given', async () => {
    let set: ReactRenderApi<any>['setState'] | undefined
    const variant = variantOf(({ state, setState }) => {
      set = setState
      return createElement('span', { 'data-story': '' }, `${state.label}:${state.count}`)
    }, { count: 1, label: 'Clicked' })
    const host = await mount(variant)

    set!({ count: 5 })

    expect(variant.state).toMatchObject({ count: 5, label: 'Clicked' })
    await vi.waitFor(() => expect(storyText(host)).toBe('Clicked:5'))
  })

  it('passes the current state to a setState function', async () => {
    let set: ReactRenderApi<any>['setState'] | undefined
    const variant = variantOf(({ state, setState }) => {
      set = setState
      return createElement('span', { 'data-story': '' }, state.count)
    }, { count: 1 })
    await mount(variant)

    set!(state => ({ count: state.count + 1 }))
    set!(state => ({ count: state.count + 1 }))

    expect(variant.state.count).toBe(3)
  })

  it('keeps the app\'s own keys on the variant\'s state', async () => {
    let set: ReactRenderApi<any>['setState'] | undefined
    const variant = variantOf(({ setState }) => {
      set = setState
      return createElement('span', { 'data-story': '' }, 'story')
    }, { count: 1, _hPropDefs: [] })
    await mount(variant)

    set!({ count: 2 })

    expect(Object.hasOwn(variant.state, '_hPropDefs')).toBe(true)
  })

  // `render` is a component body, which is what makes a hook in it legal and
  // keeps the hook's state through a re-render the panel caused.
  it('keeps a hook\'s state in render across a change from the panel', async () => {
    let toggle: (() => void) | undefined
    const variant = variantOf(({ state }) => {
      const [on, setOn] = useState(false)
      toggle = () => setOn(value => !value)
      return createElement('span', { 'data-story': '' }, `${on ? 'on' : 'off'}:${state.count}`)
    }, { count: 1 })
    const host = await mount(variant)

    toggle!()
    await vi.waitFor(() => expect(storyText(host)).toBe('on:1'))
    variant.state.count = 2
    await nextTick()

    await vi.waitFor(() => expect(storyText(host)).toBe('on:2'))
  })

  it('removes the story from the DOM when it unmounts', async () => {
    const host = await mount(variantOf(() => createElement('span', { 'data-story': '' }, 'story')))

    unmount!()
    unmount = undefined

    expect(host.querySelector('[data-story]')).toBeNull()
  })
})

describe('a story that throws', () => {
  it('reports a render error against the variant and still says it is ready', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ready = vi.fn()
    const app = createApp(RenderStory, {
      story,
      variant: variantOf(() => {
        throw new Error('story threw on purpose')
      }),
      onReady: ready,
    })
    app.mount(document.createElement('div'))
    unmount = () => app.unmount()

    await vi.waitFor(() => expect(ready).toHaveBeenCalled())
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'story threw on purpose' }))
    error.mockRestore()
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

describe('a variant whose mount is interrupted', () => {
  it('renders nothing when it was unmounted while a setup hook awaited', async () => {
    let release!: () => void
    hooks.setupReact = () => new Promise<void>((resolve) => {
      release = resolve
    })
    const rendered = vi.fn(() => createElement('span'))
    const host = document.createElement('div')
    const app = createApp(RenderStory, { story, variant: variantOf(rendered) })
    app.mount(host)
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))

    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.unmount()
    release()
    await new Promise(resolve => setTimeout(resolve))

    expect(rendered).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
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
