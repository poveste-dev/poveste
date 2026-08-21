import { expect, test } from '@playwright/test'

// The sandbox bridge is the iframe half of the same defect as #96, which was
// fixed in `plugin-vue` first. It lives in `@poveste/app`, so it is not a Vue
// problem: it is the default render path for every framework, which is why this
// spec is in the conformance suite rather than one example's.
//
// Both ends mirror the *whole* state and coordinate with a boolean meaning
// "ignore the next firing, it is my own echo". So a write on each side inside
// one task produces two messages in flight, each carrying its sender's stale
// copy of the key the other just changed. Each end applies the other's stale
// copy over its own fresh one, and the two sides end up disagreeing — the
// controls panel showing one value, the story another, with nothing left in
// flight to settle it.
//
// A story that writes state continuously does *not* show this: the next write
// re-asserts the correct value and the damage heals within a frame. It takes
// one write on each side and then silence, which is why the collision here is
// forced from a single task rather than by racing a timer.
const STORY = '/story/conformance-concurrent-state'

const LABEL = '.conformance-state-label'
const BUMPS = '.conformance-state-bumps'

test.describe('state sync race', () => {
  test('keeps both edits when the story and a control write in the same task', async ({ page }) => {
    await page.goto(STORY)

    const iframe = page.getByTestId('preview-iframe').contentFrame()
    const control = page.getByTestId('story-controls').locator('input').first()

    await expect(iframe.locator(LABEL)).toHaveText('start')
    await expect(iframe.locator(BUMPS)).toHaveText('0')

    // Proves the bridge is carrying edits at all, so a failure below is the
    // race and not a control that never worked.
    await control.fill('warmup')
    await expect(iframe.locator(LABEL)).toHaveText('warmup')

    await page.evaluate(() => {
      const frame = document.querySelector('[data-testid="preview-iframe"]') as HTMLIFrameElement
      const bump = frame.contentDocument!.querySelector('.conformance-state-bump') as HTMLElement
      const input = document.querySelector('[data-testid="story-controls"] input') as HTMLInputElement

      // Both writes land before either post is delivered.
      bump.click()

      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, 'raced')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await expect(iframe.locator(LABEL)).toHaveText('raced')
    await expect(iframe.locator(BUMPS)).toHaveText('1')
    // The panel and the story have to agree. This is the half that diverged.
    await expect(control).toHaveValue('raced')
  })
})
