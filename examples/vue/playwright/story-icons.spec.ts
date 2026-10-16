import { expect, test } from '@playwright/test'

/*
 * An icon a story or variant names was fetched from api.iconify.design when it
 * first showed, so a book had no story icons offline and every reader's browser
 * asked a third party for them (#255). This book has the collections it uses,
 * `@iconify-json/carbon` and `@iconify-json/el`, installed, and their icons now
 * ship with it.
 */
test('story and variant icons render without a request to api.iconify.design', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('api.iconify.design')) {
      requests.push(request.url())
    }
  })

  // BaseButton's variants carry `el:resize-full`, and the sidebar shows the
  // carbon icons of the stories around it.
  await page.goto('/story/src-components-basebutton-story-vue')
  await expect(page.locator('[data-testid="story-list-item"] svg').first()).toBeVisible()
  // A lookup that does go out leaves after the first render, so give it the time.
  await page.waitForTimeout(1500)

  expect(requests).toEqual([])
})
