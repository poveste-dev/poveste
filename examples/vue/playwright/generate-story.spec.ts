import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/*
 * The generate-story command, end to end against `poveste dev`. Its default file
 * name was a path, joined again to the component's directory, so the write failed
 * and the rejection exited the server; and the same happened when the file
 * already existed (#1176). Neither was reachable until the picker could list
 * components (#1146).
 */
const COMPONENTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components')
const GENERATED = join(COMPONENTS, 'Amsterdam.story.vue')

test.describe.configure({ mode: 'serial' })

test.describe('generating a story from a component', () => {
  test.beforeAll(() => {
    rmSync(GENERATED, { force: true })
  })

  test.afterAll(() => {
    rmSync(GENERATED, { force: true })
  })

  async function generate(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: 'Search stories' }).click()
    await page.getByPlaceholder(/Search for stories/).fill('Generate')
    await page.getByText('Generate Vue 3 story from component').click()
    await page.getByLabel('Choose a component').fill('Amsterdam')
    await page.getByText('src/components/Amsterdam.vue', { exact: true }).click()
    await expect(page.getByLabel('File name')).toHaveValue('Amsterdam.story.vue')
    await page.getByRole('button', { name: 'Submit' }).click()
  }

  test('writes the story beside the component and opens it', async ({ page }) => {
    await page.goto('/story/conformance-contrast')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()

    await generate(page)

    await expect(page).toHaveURL(/\/story\/src-components-amsterdam-story-vue/, { timeout: 30_000 })
    expect(readFileSync(GENERATED, 'utf8')).toContain('<Amsterdam />')
  })

  test('survives a story file that already exists, and opens nothing', async ({ page }) => {
    const existing = '<template>\n  <Story title="Existing Amsterdam" />\n</template>\n'
    writeFileSync(GENERATED, existing)
    await page.goto('/story/conformance-contrast')
    await expect(page.getByTestId('preview-iframe')).toBeVisible()

    await generate(page)

    // The server answered rather than exiting: the book still loads a story.
    await expect(page).toHaveURL(/\/story\/conformance-contrast/)
    await page.reload()
    await expect(page.getByTestId('preview-iframe').contentFrame().getByText('Contrast color')).toBeVisible()
    expect(readFileSync(GENERATED, 'utf8')).toBe(existing)
  })
})
