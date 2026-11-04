// @vitest-environment jsdom
import type { Story } from '@poveste/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The pinned 3.6 release with Vapor, so a later RC or the stable release
// changing the interop fails here rather than in a reader's book (#1112). Its
// self-contained browser build: the Node entry carries no Vapor exports, and the
// bundler one pulls in CommonJS halves under Node resolution.
vi.mock('vue', () => import('vue-vapor-rc/dist/vue.runtime-with-vapor.esm-browser.js'))
vi.mock('virtual:$poveste-plugin-vue/vapor-interop', async () => ({ default: (await import('vue') as any).vaporInteropPlugin }))
vi.mock('../global-components.js', () => ({ registerGlobalComponents: () => {} }))

const vue = await import('vue') as any
const { createPreviewHost } = await import('../host.js')

const VaporButton = vue.defineVaporComponent({
  props: { label: String },
  setup(props: { label: string }) {
    const button = vue.template('<button> </button>')()
    const text = vue.txt(button)
    vue.renderEffect(() => vue.setText(text, props.label))
    return button
  },
})

function host(component: unknown, options: { setupApp?: () => Promise<void> } = {}) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const story = { id: 'buttons', file: { component } } as unknown as Story
  const preview = createPreviewHost({
    name: 'Test',
    el,
    getStory: () => story,
    getVariant: () => options.setupApp ? { setupApp: options.setupApp } as any : null,
    renderContext: {} as any,
  })
  return { el, preview }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createPreviewHost under Vue 3.6', () => {
  it('mounts a Vapor component that an ordinary story renders', async () => {
    const story = vue.defineComponent({ render: () => vue.h(VaporButton, { label: 'Vapor' }) })
    const { el, preview } = host(story)

    await preview.mount()
    await vue.nextTick()

    expect(el.querySelector('button')?.textContent).toBe('Vapor')
    preview.unmount()
  })
})

describe('createPreviewHost when unmounted while a setup hook is pending', () => {
  function story() {
    const render = vi.fn(() => vue.h('button', 'Story'))
    return { render, Story: vue.defineComponent({ render }) }
  }

  function pendingHook() {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    return { pending, release }
  }

  it('never renders the story once the hook resolves', async () => {
    const { pending, release } = pendingHook()
    const { render, Story } = story()
    const { preview } = host(Story, { setupApp: () => pending })

    const mounting = preview.mount()
    preview.unmount()
    release()
    await mounting
    await vue.nextTick()

    expect(render).not.toHaveBeenCalled()
  })

  it('does not warn about unmounting an app that never mounted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { pending, release } = pendingHook()
    const { preview } = host(story().Story, { setupApp: () => pending })

    const mounting = preview.mount()
    preview.unmount()
    release()
    await mounting

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('renders only the later mount when mounted again before the first hook resolves', async () => {
    const first = pendingHook()
    const hooks = [() => first.pending, () => Promise.resolve()]
    const { render, Story } = story()
    const { el, preview } = host(Story, { setupApp: () => hooks.shift()!() })

    const mounting = preview.mount()
    preview.unmount()
    await preview.mount()
    first.release()
    await mounting
    await vue.nextTick()

    expect(render).toHaveBeenCalledOnce()
    expect(el.querySelectorAll('button')).toHaveLength(1)
    preview.unmount()
  })
})
