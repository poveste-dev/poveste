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

function host(component: unknown) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const story = { id: 'buttons', file: { component } } as unknown as Story
  const preview = createPreviewHost({
    name: 'Test',
    el,
    getStory: () => story,
    getVariant: () => null,
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
