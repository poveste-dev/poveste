import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/*
 * The one thing histoire has not shipped in four years: a Quasar app's own
 * components, and its boot files, running inside a book (#484).
 *
 * Paced for watching rather than for speed — the waits are the point, not
 * slowness to be tuned out.
 */
const BUTTON = '/story/src-components-quasarbutton-story-vue'
const BOOT = '/story/src-components-bootgreeting-story-vue'

const BEAT = 1200

test('a Quasar app inside a book', async ({ page }) => {
  const preview = () => page.getByTestId('preview-iframe').contentFrame()

  // 1. A real Quasar component, rendered rather than blank.
  await page.goto(BUTTON)
  await expect(preview().locator('.q-btn')).toContainText('Built with Quasar')
  await page.waitForTimeout(BEAT * 2)

  // 2. Its props are read off the component, and driving one drives it.
  const label = page.locator('.poveste-controls-component-props')
    .filter({ hasText: '<QuasarButton>' })
    .locator('.poveste-controls-component-prop-item')
    .filter({ hasText: 'label' })
    .locator('input')
  await expect(label).toBeVisible()
  await page.waitForTimeout(BEAT)

  await label.fill('')
  for (const character of 'Quasar, in a book') {
    await label.press(character === ' ' ? 'Space' : character)
    await page.waitForTimeout(45)
  }
  await expect(preview().locator('.q-btn')).toContainText('Quasar, in a book')
  await page.waitForTimeout(BEAT * 2)

  // 3. The gotcha worth showing: a boot file runs, so an app extension's
  //    components are present. Without it the build is green and the value gone.
  await page.goto(BOOT)
  await expect(preview().locator('.q-banner')).toContainText('from a boot file')
  await page.waitForTimeout(BEAT * 2)

  const video = page.video()
  expect(video, 'the run recorded no video').toBeTruthy()
  // Only after the page closes is the file finished being written.
  await page.close()
  await video!.saveAs(join(test.info().config.rootDir, '..', 'docs', 'public', 'quasar-demo.webm'))
})
