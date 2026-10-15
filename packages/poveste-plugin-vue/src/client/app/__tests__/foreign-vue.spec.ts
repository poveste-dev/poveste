// @vitest-environment jsdom
import { createApp as bundledCreateApp, defineComponent as bundledDefineComponent, h as bundledH } from '@poveste/vendors/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
// A copy of Vue genuinely other than the vendored one. In this workspace `vue` and
// `@poveste/vendors/vue` resolve to one file, so `vue` itself cannot stand in for a
// consumer's copy here; `host.spec.ts` uses this build for the same reason.
// @ts-expect-error a browser build with no types
import { createApp } from 'vue-vapor-rc/dist/vue.runtime-with-vapor.esm-browser.js'
import MountStory from '../MountStory.js'
import { resetForeignVueWarning, warnIfForeignVue } from '../util.js'

vi.mock('../global-components.js', () => ({ registerGlobalComponents: () => {} }))

// Mounted with the consumer's Vue, a component built against the vendored one
// rendered nothing and said nothing, which read as a story with no variants (#940).
describe('a client component rendered by another copy of Vue', () => {
  afterEach(() => {
    resetForeignVueWarning()
    vi.restoreAllMocks()
  })

  it('warns, naming the component and the copy it needs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    createApp(MountStory, { story: { id: 'a', title: 'A', variants: [] } }).mount(document.createElement('div'))

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/MountStory was rendered by a copy of Vue other than `@poveste\/vendors\/vue`/))
  })

  it('warns once, however many components it renders', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    for (let i = 0; i < 3; i++) {
      createApp(MountStory, { story: { id: 'a', title: 'A', variants: [] } }).mount(document.createElement('div'))
    }

    // Vue's own development warnings land on the same spy, so count only ours.
    expect(warn.mock.calls.filter(([message]) => String(message).startsWith('[poveste]'))).toHaveLength(1)
  })

  it('stays quiet when the vendored copy renders it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Vendored = bundledDefineComponent({
      setup() {
        warnIfForeignVue('Vendored')
        return () => bundledH('div')
      },
    })

    bundledCreateApp(Vendored).mount(document.createElement('div'))

    expect(warn).not.toHaveBeenCalled()
  })
})
