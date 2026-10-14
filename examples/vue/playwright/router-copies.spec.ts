import { expect, test } from '@playwright/test'

// In `poveste dev` a page can hold two copies of the chrome's router module: each
// importer's URL is stamped when the server serves it, and a story edit stamps
// most of the chrome. The story store took whichever copy it was evaluated with,
// and when that was not the one the app installed, its route stayed at `/` and the
// page showed no story until reloaded (#1320). Which copy a page gets is a race,
// so this loads a second copy itself, as a stamped importer would.
test('a second copy of the router module hands out the router the app installed', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => (document.querySelector('#app') as any)?.__vue_app__?.config.globalProperties.$router)

  const same = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(name => /\/bundled\/router\.js(?:\?|$)/.test(name))
    if (!url) {
      return 'the page loaded no router module'
    }
    // A timestamp the way the server stamps one: Vite reads only thirteen digits
    // as a stamp, and anything else names a different module.
    const copy = await import(/* @vite-ignore */ `${url.replace(/[?&]t=\d+/, '')}?t=${Date.now()}`)
    return copy.router === (document.querySelector('#app') as any).__vue_app__.config.globalProperties.$router
  })

  expect(same).toBe(true)
})
