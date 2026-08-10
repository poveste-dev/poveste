import { expect, test } from '@playwright/test'

// Regression guard for #77: navigating grid → single variant → grid used to
// wedge the renderer outright — no paint, no script, `page.evaluate` timing out.
//
// The cause was a leaked pair of `deep: true` state-sync watchers. `Variant`'s
// setup() is async, and a story with `init-state` suspends on that await, so
// the `onBeforeUnmount` that stopped the watchers was registered too late for
// Vue to bind it and never ran. Each grid visit left its pairs behind, and once
// several pairs watched the same variant state they re-triggered each other
// forever.
//
// Both stories used here declare `init-state`, which is what makes setup()
// actually suspend. Swapping either for a story without it stops reproducing.
const GRID = '/story/src-components-basebutton-story-vue'
const SINGLE = '/story/src-components-colorbutton-story-vue'

test.describe('state sync across story navigation', () => {
  test('stays responsive through repeated grid ↔ single navigation', async ({ page }) => {
    // A wedged renderer never returns from evaluate, so the failure mode here
    // is a timeout rather than an assertion — keep it well clear of the hang.
    test.setTimeout(90_000)

    await page.goto(GRID)
    await expect(page.locator('iframe[data-test-id="preview-iframe"]').first()).toBeVisible()

    const clickStory = async (href: string) => {
      await page.locator(`a[href$="${href.split('/').pop()}"]`).first().click()
    }

    for (let i = 0; i < 4; i++) {
      await clickStory(SINGLE)
      await expect(page).toHaveURL(/colorbutton/)

      await clickStory(GRID)
      await expect(page).toHaveURL(/basebutton/)

      // The real assertion: the main thread is still scheduling. Before the fix
      // this call never resolved once the third navigation had landed.
      const alive = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          requestAnimationFrame(() => resolve(true))
        })
      }, { timeout: 5000 } as any)
      expect(alive).toBe(true)
    }

    // The grid renders one sandbox iframe per variant, and BaseButton has 3.
    await expect(page.locator('iframe[data-test-id="preview-iframe"]')).toHaveCount(3)
  })

  test('binds the variant unmount hook, so no state sync outlives its story', async ({ page }) => {
    const warnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('onBeforeUnmount is called when there is no active component instance')) {
        warnings.push(message.text())
      }
    })

    await page.goto(GRID)
    await expect(page.locator('iframe[data-test-id="preview-iframe"]').first()).toBeVisible()

    // Vue drops any lifecycle hook registered after an await in an async
    // setup() and warns. That warning firing means the teardown is unbound
    // again and the watchers are leaking, whether or not the page has hung yet.
    expect(warnings).toEqual([])
  })
})
