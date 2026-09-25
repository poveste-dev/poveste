import { expect, test } from '@playwright/test'
import { openStory } from './support.js'

// The controls panel is `@poveste/app` plus `@poveste/controls`, shared by every
// framework — but what reaches a control is the framework's own state binding,
// and that is where the two differ: Vue's `v-model` against Svelte 5's
// `bind:value`, which passes a getter/setter pair rather than a value. A control
// that silently stops writing back under one plugin is exactly the regression
// this suite exists to catch, and it had no cross-framework coverage.
const STORY = 'conformance-controls'
const STATE = '.conformance-controls-state'

test.describe('controls', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, STORY)
  })

  test('writes text back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"label": "Hello"')
    await controls.locator('.poveste-wrapper').filter({ hasText: 'Label' }).locator('input').fill('Foo')
    await expect(state).toContainText('"label": "Foo"')
  })

  test('writes a checkbox back to the state, both ways', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"enabled": false')
    await controls.getByText('Enabled').click()
    await expect(state).toContainText('"enabled": true')
    // Back again: a control that only ever writes `true` passes a one-way check.
    await controls.getByText('Enabled').click()
    await expect(state).toContainText('"enabled": false')
  })

  test('writes a number back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"count": 20')
    await controls.locator('input[type="number"]').fill('42')
    // Unquoted: a control that writes the string "42" still renders as 42 on
    // screen, and this is the assertion that tells them apart.
    await expect(state).toContainText('"count": 42')
  })

  test('writes a textarea back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"notes": "Longer text..."')
    await controls.locator('textarea').fill('Meow meow meow')
    await expect(state).toContainText('"notes": "Meow meow meow"')
  })

  test('writes a select back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"game": "crash-bandicoot"')

    // Not a native `<select>` — it is a popover, so the option is picked by
    // clicking its label in the popper.
    await controls.locator('.poveste-wrapper').filter({ hasText: 'Game' }).click()
    await page.locator('.poveste-select-popper').getByText('The Last of Us').click()

    await expect(state).toContainText('"game": "the-last-of-us"')
  })

  // The five tests around this one drive the select entirely by clicking, and
  // every one of them passed while the options were bare `div`s with an
  // `@click` — no role, no `aria-selected`, no key handler (#955). A control
  // that looks well covered is exactly the one nobody re-reads, which is how
  // the same omission shipped in #969's checkbox list.
  test('offers the options as a listbox rather than as a stack of divs', async ({ page }) => {
    const controls = page.getByTestId('story-controls')

    await controls.locator('.poveste-wrapper').filter({ hasText: 'Game' }).click()

    const listbox = page.locator('.poveste-select-popper [role="listbox"]')
    await expect(listbox).toBeVisible()

    const options = listbox.getByRole('option')
    expect(await options.count()).toBeGreaterThan(1)

    // The held one says so, and only it: a listbox where every row reads
    // unselected tells a screen reader nothing about the current value.
    await expect(listbox.locator('[aria-selected="true"]')).toHaveCount(1)
    await expect(listbox.locator('[aria-selected="true"]')).toHaveText('Crash Bandicoot')
  })

  test('picks an option from the keyboard, without a pointer anywhere', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"game": "crash-bandicoot"')

    // Focused and opened by key rather than clicked, so nothing in this test
    // reaches the control the way the tests above it do.
    await controls.locator('.poveste-select [aria-expanded]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.poveste-select-popper')).toBeVisible()

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await expect(state).toContainText('"game": "the-last-of-us"')
  })

  // A control renders in two realms, and the popper's target differs between
  // them: the chrome has `.poveste-app-root`, a sandbox has no such element and
  // tags its own body as the render root instead. A fixed selector passes the
  // first of these and renders *nothing* in the second — `aria-expanded` goes
  // true and no popper appears — which a production build does not even warn
  // about. Both are asserted because only the pair catches that (#63).
  test('opens the chrome popper inside the app root', async ({ page }) => {
    const controls = page.getByTestId('story-controls')

    await controls.locator('.poveste-wrapper').filter({ hasText: 'Game' }).click()

    await expect(page.locator('.poveste-select-popper')).toBeVisible()
    await expect(page.locator('.poveste-app-root [data-reka-popper-content-wrapper]')).toHaveCount(1)
  })

  test('opens the sandbox popper against that document\'s body', async ({ page }, testInfo) => {
    // Svelte's collector renders the default slot with an `Hst` carrying only
    // `Story` and `Variant`, so a built-in control there fails collection
    // outright — the Svelte books cannot host this one. What is under test is
    // the same `@poveste/controls` build in every book.
    test.skip(testInfo.project.name.startsWith('svelte'), 'a built-in control in the default slot does not collect under Svelte')

    const preview = page.getByTestId('preview-iframe').contentFrame()

    // The trigger rather than the wrapper around it: this one is laid out wide,
    // so the wrapper's centre is the gap beside the control.
    await preview.locator('.poveste-select [aria-expanded]').click()

    await expect(preview.locator('.poveste-select-popper')).toBeVisible()
    await expect(preview.locator('body > [data-reka-popper-content-wrapper]')).toHaveCount(1)
  })

  // floating-vue capped the popper against the boundary and scrolled what did
  // not fit. Nothing replaced that, so a list longer than the room below the
  // trigger ran off the screen and the options past the edge could not be
  // reached at all — by pointer or by scroll (#63).
  test('caps the popper at the room it has, and scrolls the rest', async ({ page }) => {
    const controls = page.getByTestId('story-controls')

    await controls.locator('.poveste-wrapper').filter({ hasText: 'Game' }).click()
    const options = page.locator('.poveste-app-root .poveste-select-options')
    await expect(options).toBeVisible()

    const box = await options.evaluate(node => ({
      maxHeight: getComputedStyle(node).maxHeight,
      overflowY: getComputedStyle(node).overflowY,
      viewport: window.innerHeight,
    }))

    // Read off the element rather than compared with a number: what the cap
    // should be is Reka's measurement, and asserting that it exists and fits on
    // the screen is the part a missing rule breaks.
    expect(box.overflowY, 'the options scroll rather than run off the screen').toBe('auto')
    expect(box.maxHeight, 'the list is capped at all').not.toBe('none')
    expect(Number.parseFloat(box.maxHeight), 'the cap fits on the screen').toBeLessThanOrEqual(box.viewport)
  })

  // The four below joined the conformance story with this suite (#971). Being
  // rendered in five books is what #672 gave the controls book and was told in
  // terms was not a substitute for asserting their behaviour, so each of these
  // drives the control and reads the state back.

  test('writes a radio back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"size": "md"')
    await controls.locator('.poveste-wrapper').filter({ hasText: 'Size' }).getByText('Large').click()
    await expect(state).toContainText('"size": "lg"')
  })

  test('writes a checkbox list back to the state, and keeps what was already in it', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await controls.locator('.poveste-wrapper').filter({ hasText: 'Toppings' }).getByText('basil').click()

    // Both, in order: a list control that replaces rather than appends passes a
    // check that only looks for the one just clicked.
    await expect(state).toContainText(/"pizza":\s*\[\s*"cheese",\s*"basil"\s*\]/)
  })

  test('writes a button group back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    const group = controls.locator('.poveste-wrapper').filter({ hasText: 'Align' })
    await expect(state).toContainText('"align": "left"')
    await group.getByRole('button', { name: 'center' }).click()
    await expect(state).toContainText('"align": "center"')

    // Clicking the held option again must not clear it: `ToggleGroupRoot`
    // deselects by default and emits `undefined`, which would write the prop
    // away (#985).
    await group.getByRole('button', { name: 'center' }).click()
    await expect(state).toContainText('"align": "center"')
  })

  // Not a tooltip test — `slider-tooltip.spec.ts` covers that. This is the
  // claim #989 rests on: a native `input[type=range]` already has the arrow
  // keys, so the control did not need `SliderRoot` to gain them.
  test('moves the slider from the keyboard, and writes that back', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"opacity": 50')
    await controls.locator('.poveste-slider-input').first().focus()
    await page.keyboard.press('ArrowRight')

    // Unquoted: a control that writes the string "51" still renders as 51.
    await expect(state).toContainText('"opacity": 51')
  })

  test('writes a colour back to the state', async ({ page }) => {
    const state = page.getByTestId('preview-iframe').contentFrame().locator(STATE)
    const controls = page.getByTestId('story-controls')

    await expect(state).toContainText('"tint": "#000000"')
    await controls.locator('.poveste-wrapper').filter({ hasText: 'Tint' }).locator('input[type="text"]').fill('#ffffff')
    await expect(state).toContainText('"tint": "#ffffff"')
  })
})
