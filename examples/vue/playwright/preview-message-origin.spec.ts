import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { expect, test } from '@playwright/test'

// A story can navigate its preview frame off-site, and the frame keeps the window
// the book checks `event.source` against, so the site it lands on could post the
// book its own message types (#1494). A second port on localhost is a second origin.
let server: Server
let foreign: string

test.beforeAll(async () => {
  server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end('<!doctype html><title>elsewhere</title>')
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  foreign = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
})

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})

const EVENT = '__poveste:event'
const ERROR = '__poveste:sandbox-error'

test('the book ignores what a preview frame posts from another origin', async ({ page }) => {
  await page.goto('/story/conformance-controls?tab=events')
  // This preview's own frame: the book can hold other sandbox frames, and only this
  // one's window passes the host's `event.source` check. Playwright keeps one
  // `Frame` for it across the navigation below.
  const preview = page.getByTestId('preview-iframe').first()
  await expect(preview).toBeVisible()
  const frame = (await (await preview.elementHandle())!.contentFrame())!

  // From the book's own origin first, so the panel is shown to work.
  await frame.evaluate(type => parent.postMessage({ type, event: { name: 'GENUINE-EVENT', argument: {} } }, location.origin), EVENT)
  await expect(page.getByText('GENUINE-EVENT')).toBeVisible()

  await frame.evaluate((url) => {
    location.href = url
  }, `${foreign}/elsewhere.html`).catch(() => {})
  await expect.poll(() => frame.url()).toContain(foreign)
  await frame.waitForLoadState()

  await frame.evaluate(([event, error]) => {
    parent.postMessage({ type: error, message: 'INJECTED-ERROR', stack: '' }, '*')
    parent.postMessage({ type: event, event: { name: 'INJECTED-EVENT', argument: {} } }, '*')
  }, [EVENT, ERROR])
  // Long enough for the genuine event above to have shown twice over.
  await page.waitForTimeout(1_000)

  await expect(page.getByText('INJECTED-ERROR')).toHaveCount(0)
  await expect(page.getByText('INJECTED-EVENT')).toHaveCount(0)
})
