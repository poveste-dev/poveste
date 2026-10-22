import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { seedChromeScheme } from './support'

/*
 * A builtin control a story renders in its own content, in a sandboxed story. The
 * sandbox loads the controls' CSS and none of the chrome's, so a control reading the
 * chrome's `--color-*` rendered unstyled: `display: inline`, no border colour, square
 * corners (#1443). The controls now carry their own tokens, and follow the preview's
 * dark rather than the chrome's.
 */
// The story page, so the app sends the sandbox its preview settings as it does for a reader:
// a sandbox opened alone resolves its preview from the chrome's scheme.
const STORY = '/story/conformance-controls'

// The Svelte books keep this story's controls in the panel, with none in its content.
function skipSvelte(testInfo: TestInfo) {
  test.skip(testInfo.project.name.startsWith('svelte'), 'no builtin control in this book\'s story content')
}

function preview(page: Page) {
  return page.getByTestId('preview-iframe').contentFrame()
}

async function selectTrigger(page: Page) {
  const trigger = preview(page).locator('.__poveste-render-story [data-slot="trigger"]').first()
  await expect(trigger).toBeVisible()
  return trigger.evaluate((element) => {
    const style = getComputedStyle(element)
    return { display: style.display, radius: style.borderTopLeftRadius, border: style.borderTopColor }
  })
}

test('a builtin control in a sandboxed story is styled, on a light preview under a dark chrome', async ({ page }, testInfo) => {
  skipSvelte(testInfo)
  await seedChromeScheme(page, 'dark')
  await page.emulateMedia({ colorScheme: 'light' })

  await page.goto(STORY)
  const trigger = await selectTrigger(page)

  expect(trigger.display).toBe('flex')
  expect(trigger.radius).not.toBe('0px')
  expect(trigger.border).toBe('rgba(0, 0, 0, 0.25)')
})

test('a builtin control in a sandboxed story follows a dark preview under a light chrome', async ({ page }, testInfo) => {
  skipSvelte(testInfo)
  await seedChromeScheme(page, 'light')
  await page.emulateMedia({ colorScheme: 'dark' })

  await page.goto(STORY)

  expect((await selectTrigger(page)).border).toBe('rgba(255, 255, 255, 0.25)')
})

// Carrying their own tokens is what keeps the controls out of the story's namespace:
// a book on Tailwind 4 defines `--color-gray-200` itself, and the sandbox must not.
test('a sandboxed story\'s realm gets no chrome token from the controls', async ({ page }, testInfo) => {
  skipSvelte(testInfo)
  await page.goto(STORY)
  await selectTrigger(page)

  const root = await preview(page).locator('html').evaluate(html => getComputedStyle(html).getPropertyValue('--color-gray-200'))

  expect(root).toBe('')
})
