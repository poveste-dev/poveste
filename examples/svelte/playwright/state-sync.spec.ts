import { expect, test } from '@playwright/test'
import { AUTHORED_CHECKBOX } from './support.js'

test.describe('state sync', () => {
  test('writes a control change back into the story state', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    const controls = page.getByTestId('story-controls')

    await expect(controls.locator('pre')).toContainText('"disabled": false')

    await controls.locator(AUTHORED_CHECKBOX).click()
    await expect(controls.locator('pre')).toContainText('"disabled": true')
  })

  // The two below need state to cross between component instances — the controls
  // slot renders in the app frame, the story body in the sandbox — and on Svelte 5
  // there is no bridge to carry it.
  //
  // `render.ts` syncs through `getLegacyStateApi`, which requires Svelte 4's
  // `$capture_state` / `$inject_state`. Svelte 5 emits neither: the only two
  // occurrences in a built book are inside our own `typeof` probe, so the function
  // always returns null and the whole sync block — `apply`, the rAF loop,
  // `injectState` — is skipped.
  //
  // Not the same fault the write-back had. That one was `createWrappedComponent`
  // spreading the props object, which turned Svelte 5's `bind:` accessor into a
  // plain data property and dropped the setter; fixed, and guarded by the test
  // above. These need a Svelte 5 replacement for a capture/inject API that Svelte 5
  // deliberately does not provide, which is a design decision rather than a fix.
  //
  // Tracked in #81.
  test('syncs disabled state between iframe story and controls', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    const controls = page.getByTestId('story-controls')

    await expect(iframe.locator('button')).not.toHaveClass(/disabled/)

    await controls.locator(AUTHORED_CHECKBOX).click()
    await expect(controls.locator('pre')).toContainText('"disabled": true')
    await expect(iframe.locator('button')).toHaveClass(/disabled/)

    await iframe.locator('input[type="checkbox"]').click()
    await expect(controls.locator('pre')).toContainText('"disabled": false')
  })

  test('syncs text state between inline story and controls', async ({ page }) => {
    await page.goto('/story/src-noiframe-story-svelte?variantId=_default')
    const sandbox = page.getByTestId('sandbox-render')
    const controls = page.getByTestId('story-controls')

    await expect(sandbox.getByText('Some content', { exact: true })).toBeVisible()

    await controls.locator('input').fill('42')
    await expect(sandbox.getByText('42', { exact: true })).toBeVisible()

    await sandbox.locator('input').fill('Meow')
    await expect(controls.locator('input')).toHaveValue('Meow')
  })
})

test.describe('missing initState', () => {
  test('says loudly that controls cannot reach the story', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })

    await page.goto('/story/src-unmigratedstate-story-svelte?variantId=_default')
    await expect(page.getByTestId('story-controls').locator(AUTHORED_CHECKBOX)).toBeVisible()

    const warning = errors.find(text => text.includes('[poveste]'))
    expect(warning, 'expected a [poveste] console error naming the missing initState').toBeTruthy()
    expect(warning).toContain('no `initState`')
    expect(warning).toContain('mounted separately for each slot')
  })
})

test.describe('source panel', () => {
  // `source` used to be a reactive block in the story's script. With state owned
  // by the variant it has to be a function of that state, or the panel freezes
  // at whatever the story rendered first.
  test('tracks the controls', async ({ page }) => {
    await page.goto('/story/src-basebutton-story-svelte?variantId=_default')
    const source = page.getByTestId('story-source-code')
    const controls = page.getByTestId('story-controls')

    await expect(source).toContainText('<BaseButton>Click me !</BaseButton>')

    await controls.locator(AUTHORED_CHECKBOX).click()
    await expect(source).toContainText('<BaseButton disabled>Click me !</BaseButton>')
  })
})
