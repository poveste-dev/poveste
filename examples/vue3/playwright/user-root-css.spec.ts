import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Setup-file CSS is wrapped in `@scope (.__poveste-render-story)`, which puts
// `html` and `body` above the scoping root — a rule targeting either can never
// match unless it is rewritten to `:scope` (#116). The tokens come from
// `src/poveste.css`; `:root` is the spelling that already worked.
const TOKENS = {
  '--user-html-token': 'rebeccapurple',
  '--user-body-token': '14px',
  '--user-primary': 'tomato',
} as const

// `layout: { type: 'single', iframe: false }` — rendered by the app itself.
const NATIVE_STORY = '/story/src-components-complexparameter-story-vue?variantId=_default'
const IFRAME_STORY = '/story/src-components-contrastcolor-story-vue?variantId=_default'

function readTokens(scope: Page | ReturnType<Page['frameLocator']>, selector: string) {
  return scope.locator(selector).first().evaluate((el, names) => {
    const style = getComputedStyle(el)
    return Object.fromEntries(names.map(n => [n, style.getPropertyValue(n).trim()]))
  }, Object.keys(TOKENS))
}

// The story content root in both render paths. In the iframe the *body* also
// carries `__poveste-render-story`, so that class alone is ambiguous there.
const STORY = '.poveste-generic-render-story'

test.describe('root selectors in setup-file CSS', () => {
  test('reach a story the app renders itself', async ({ page }) => {
    await page.goto(NATIVE_STORY)
    await expect(page.getByTestId('sandbox-render').locator(STORY)).toBeVisible()

    expect(await readTokens(page, `[data-test-id="sandbox-render"] ${STORY}`)).toEqual(TOKENS)
  })

  test('reach a story rendered in the sandbox iframe', async ({ page }) => {
    await page.goto(IFRAME_STORY)
    const frame = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    await expect(frame.locator(STORY)).toBeVisible()

    expect(await readTokens(frame, STORY)).toEqual(TOKENS)
  })

  test('do not leak onto the app chrome', async ({ page }) => {
    await page.goto(NATIVE_STORY)
    await expect(page.getByTestId('sandbox-render')).toBeVisible()

    // The wrap exists to keep consumer CSS off the chrome; a rewrite that
    // targeted the document root instead of the scope root would show up here.
    const onChrome = await page.locator('html').evaluate((el, names) => {
      const style = getComputedStyle(el)
      return names.filter(n => style.getPropertyValue(n).trim() !== '')
    }, Object.keys(TOKENS))
    expect(onChrome).toEqual([])
  })
})
