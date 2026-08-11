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
  // The only one of these three that fails without the rewrite: the app-rendered
  // path is the one whose stylesheet gets wrapped. The other two pass either way
  // and are here as regression guards, not as coverage for #116.
  test('reach a story the app renders itself', async ({ page }) => {
    await page.goto(NATIVE_STORY)
    await expect(page.getByTestId('sandbox-render').locator(STORY)).toBeVisible()

    expect(await readTokens(page, `[data-test-id="sandbox-render"] ${STORY}`)).toEqual(TOKENS)
  })

  // `bundle-sandbox.css` is not wrapped — inside the iframe the story root *is*
  // the body, so these selectors resolve natively. Pins that, nothing more.
  test('reach a story rendered in the sandbox iframe', async ({ page }) => {
    await page.goto(IFRAME_STORY)
    const frame = page.frameLocator('iframe[data-test-id="preview-iframe"]')
    await expect(frame.locator(STORY)).toBeVisible()

    expect(await readTokens(frame, STORY)).toEqual(TOKENS)
  })

  // The wrap exists to keep consumer CSS off the chrome; a rewrite that landed
  // on the document root instead of the scope root would show up here.
  test('do not leak onto the app chrome', async ({ page }) => {
    await page.goto(NATIVE_STORY)
    await expect(page.getByTestId('sandbox-render')).toBeVisible()

    expect(await readTokens(page, 'html')).toEqual({
      '--user-html-token': '',
      '--user-body-token': '',
      '--user-primary': '',
    })
  })

  // `html.my-dark { background: #27272a }` in `src/poveste.css` — the ordinary
  // way a consumer dark-styles their own stories. It needs both halves: the
  // `html` rewrite from #116, and the story's dark class rather than the
  // chrome's, which is what #123 was.
  test('paint the story when the consumer dark rule matches', async ({ page }) => {
    await page.goto(NATIVE_STORY)
    const story = page.getByTestId('sandbox-render').locator(STORY)
    await expect(story).toBeVisible()
    await expect(story).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

    await page.getByTestId('toolbar-background').click()
    await page.getByTestId('sandbox-color-scheme-dark').click()
    await page.getByTestId('toolbar-background').click()

    await expect(story).toHaveCSS('background-color', 'rgb(39, 39, 42)')
    await expect(story).toHaveCSS('color', 'rgb(233, 233, 237)')
  })
})
