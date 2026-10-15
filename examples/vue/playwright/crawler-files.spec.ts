import { expect, test } from '@playwright/test'

/*
 * What a deployed book tells a crawler. With no robots.txt in the build, a host's
 * SPA fallback answered /robots.txt with the book's index.html, which a crawler
 * reads as a malformed robots file. And the index page had no description (#316).
 */
test.describe('a built book', () => {
  test('serves a robots.txt of its own rather than the page', async ({ request }) => {
    const response = await request.get('/robots.txt')

    expect(response.headers()['content-type']).toContain('text/plain')
    expect(await response.text()).toBe('User-agent: *\nAllow: /\n')
  })

  test('describes itself on its index page', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Poveste, a book of component stories.')
  })
})
