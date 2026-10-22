import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { seedChromeScheme, seedPreviewSettings } from './support'

/*
 * The backdrop a story sits on follows the preview's colour scheme, not the
 * chrome's: it was a `dark:` utility, which keys on the chrome, so a dark preview
 * under a light chrome showed its dark content on white (#1449).
 */

// The book's default background, so the backdrop is what shows.
const NO_BACKGROUND = { backgroundColor: 'transparent', backgroundColorPicked: false }

// A pixel just inside the bottom-left corner, where no story content reaches.
async function cornerPixel(page: Page, box: Locator) {
  const rect = (await box.boundingBox())!
  const shot = await page.screenshot({ clip: { x: rect.x + 8, y: rect.y + rect.height - 10, width: 3, height: 3 } })
  return page.evaluate(async (png) => {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const [r, g, b] = context.getImageData(1, 1, 1, 1).data
    return { r: r!, g: g!, b: b! }
  }, shot.toString('base64'))
}

function isDarkPixel({ r, g, b }: { r: number, g: number, b: number }) {
  return (r + g + b) / 3 < 128
}

async function singleBackdrop(page: Page, id: string) {
  await page.goto(`/story/${id}`)
  const box = page.getByTestId('responsive-preview-bg').first()
  await expect(box).toBeVisible()
  return cornerPixel(page, box)
}

for (const id of ['conformance-controls', 'conformance-no-iframe']) {
  test(`the backdrop of ${id} is dark on a dark preview under a light chrome`, async ({ page }) => {
    await seedChromeScheme(page, 'light')
    await seedPreviewSettings(page, { ...NO_BACKGROUND, colorScheme: 'dark' })

    expect(isDarkPixel(await singleBackdrop(page, id))).toBe(true)
  })

  test(`the backdrop of ${id} is light on a light preview under a dark chrome`, async ({ page }) => {
    await seedChromeScheme(page, 'dark')
    await seedPreviewSettings(page, { ...NO_BACKGROUND, colorScheme: 'light' })

    expect(isDarkPixel(await singleBackdrop(page, id))).toBe(false)
  })
}

test('a grid cell\'s backdrop is dark on a dark preview under a light chrome', async ({ page }) => {
  await seedChromeScheme(page, 'light')
  await seedPreviewSettings(page, { ...NO_BACKGROUND, colorScheme: 'dark' })

  await page.goto('/story/conformance-grid')
  const body = page.locator('.poveste-story-variant-grid-item').first().getByTestId('sandbox-render').locator('..')
  await expect(body).toBeVisible()

  expect(isDarkPixel(await cornerPixel(page, body))).toBe(true)
})

test('a picked background still wins over the backdrop on a dark preview', async ({ page }) => {
  await seedChromeScheme(page, 'light')
  await seedPreviewSettings(page, { colorScheme: 'dark', backgroundColor: '#ff0000', backgroundColorPicked: true })

  expect(await singleBackdrop(page, 'conformance-no-iframe')).toEqual({ r: 255, g: 0, b: 0 })
})
