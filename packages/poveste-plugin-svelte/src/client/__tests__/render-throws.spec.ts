// @vitest-environment jsdom
import { SANDBOX_ERROR } from '@poveste/shared'
import { createApp, h } from '@poveste/vendors/vue'
import { afterEach, expect, it, vi } from 'vitest'
import Throws from '../../../fixtures/render/Throws.svelte'
import RenderStory from '../render.js'

afterEach(() => {
  vi.restoreAllMocks()
})

// The host shows the panel on ready, and reads a ready with no error before it as a
// clean render, so a throw has to be reported first and still be followed by one (#1736).
it('reports a story that throws while rendering, then says it is ready', async () => {
  const said: string[] = []
  vi.spyOn(window, 'parent', 'get').mockReturnValue({ postMessage: (data: { type: string }) => said.push(data.type) } as unknown as Window)
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

  const story = { id: 'story', title: 'Story', file: { component: Throws }, variants: [] }
  const variant = { id: 'variant', state: {}, configReady: true }
  const app = createApp({ render: () => h(RenderStory, { story, variant, slotName: 'default', onReady: () => said.push('ready') }) })
  app.mount(document.createElement('div'))

  await vi.waitFor(() => expect(said).toContain('ready'))
  expect(said).toEqual([SANDBOX_ERROR, 'ready'])
  expect(logged).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('component blew up on purpose') }))
  app.unmount()
})
