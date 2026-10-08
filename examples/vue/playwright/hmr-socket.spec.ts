import { expect, test } from '@playwright/test'

// The HMR socket has to be on the book's own port. StackBlitz previews each port
// on its own hostname and routes no other, so a socket on a second port never
// connected, and a page opened before collection ended waited for its story list
// on it and stayed blank (#1245).
test('the HMR socket connects on the book\'s own port', async ({ page, baseURL }) => {
  const connected = page.waitForEvent('console', message => message.text() === '[vite] connected.')
  const socket = page.waitForEvent('websocket', ws => new URL(ws.url()).searchParams.has('token'))

  await page.goto('/')

  expect(new URL((await socket).url()).port).toBe(new URL(baseURL!).port)
  await connected
})
