import { expect, test } from '@playwright/test'

// Regression guard for #95, and specifically for getting half of it wrong.
//
// State crosses between the two Vue copies through `applyState`, which iterates
// the keys it is given — so a key the story has removed is never visited, and
// the write it performs for that change lands nothing on the far side. Both
// ends coordinate through a `syncing` flag meaning "ignore the next firing, it
// is my own echo", and the far side's firing is what clears it. No firing meant
// no clear, and the next edit — arriving from the controls panel, a different
// writer entirely — was read as an echo and dropped.
//
// This does not fail on `main`, and that is the point. Every Vue story carries
// `_hPropState` and `_hPropDefs`, and `applyState` re-identified those on every
// apply, so a counterpart firing was guaranteed and the flag stayed honest by
// accident. Which makes the fix #95 proposed on its own — skip writes that
// change nothing — worse than no fix: it removes the accident and leaves the
// flag. This test fails on exactly that half-fix, and passes both before the
// change and after the whole of it.
//
// Both edits below are needed to see it. The first proves the control worked
// before the removal; the last is the one that goes missing.
test.describe('state key removal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('story-list-item').filter({ hasText: /^State key removal\d*$/ }).click()
  })

  test('keeps mirroring control edits after the story removes a state key', async ({ page }) => {
    const iframe = page.getByTestId('preview-iframe').contentFrame()
    const label = page.getByTestId('story-controls').locator('.poveste-wrapper').filter({ hasText: 'label' }).locator('input')

    await expect(iframe.getByTestId('extras')).toHaveText('keep,drop')
    await expect(iframe.getByTestId('label')).toHaveText('start')

    await label.fill('before')
    await expect(iframe.getByTestId('label')).toHaveText('before')

    await iframe.getByTestId('drop').click()
    await expect(iframe.getByTestId('extras')).toHaveText('keep')

    await label.fill('after')
    await expect(iframe.getByTestId('label')).toHaveText('after')
  })
})
