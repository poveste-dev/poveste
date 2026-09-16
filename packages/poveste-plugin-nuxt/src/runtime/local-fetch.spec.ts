import { createApp, createError, createRouter, defineEventHandler } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { createLocalFetch } from './local-fetch'

function appWith(routes: Record<string, () => unknown>) {
  const router = createRouter()
  for (const [path, handler] of Object.entries(routes)) {
    router.get(path, defineEventHandler(handler))
  }
  return createApp().use(router)
}

describe('createLocalFetch', () => {
  it('answers a path from the in-memory app, without the network', async () => {
    const network = vi.fn<typeof fetch>()
    const localFetch = createLocalFetch(appWith({ '/_api/greeting': () => 'hello from h3' }), network)

    const response = await localFetch('/_api/greeting')

    expect(await response.text()).toBe('hello from h3')
    expect(network).not.toHaveBeenCalled()
  })

  it('sends an absolute URL to the real fetch', async () => {
    const network = vi.fn<typeof fetch>(async () => new Response('from the network'))
    const localFetch = createLocalFetch(appWith({}), network)

    await localFetch('https://poveste.dev/api/status', { method: 'HEAD' })

    expect(network).toHaveBeenCalledWith('https://poveste.dev/api/status', { method: 'HEAD' })
  })

  // `//host/path` starts with a slash and is another origin, so answering it
  // from the in-memory app would hand back a 404 for something that exists.
  it('sends a protocol-relative URL to the real fetch', async () => {
    const network = vi.fn<typeof fetch>(async () => new Response('from the cdn'))
    const localFetch = createLocalFetch(appWith({}), network)

    const response = await localFetch('//cdn.example.com/data.json')

    expect(await response.text()).toBe('from the cdn')
    expect(network).toHaveBeenCalledWith('//cdn.example.com/data.json', undefined)
  })

  it('answers a path no route handles with a 404 rather than throwing', async () => {
    const localFetch = createLocalFetch(appWith({}), vi.fn<typeof fetch>())

    const response = await localFetch('/_api/missing')

    expect(response.status).toBe(404)
  })

  it('keeps the status of an error a route throws', async () => {
    const teapot = () => {
      throw createError({ statusCode: 418, statusMessage: 'I am a teapot' })
    }
    const localFetch = createLocalFetch(appWith({ '/_api/teapot': teapot }), vi.fn<typeof fetch>())

    const response = await localFetch('/_api/teapot')

    expect(response.status).toBe(418)
  })
})
