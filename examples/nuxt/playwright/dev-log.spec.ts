import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { expect, test } from '@playwright/test'

// A page mount and a story edit both re-collect, and each re-collection used to
// print `NUXT_E1005`, Vue's invalid-vnode warnings and `[nostics]` lines with
// nothing wrong (#1283, fixed by #1370). The unit spec there could not see it,
// and neither could the npm consumer in the smoke test: the defect needs the
// workspace's single copy of `unctx` (#1373).
const LOG = join(dirname(fileURLToPath(import.meta.url)), '..', 'poveste-dev.log')
// It runs alone, after the other dev specs: their pages' console warnings reach
// the same log. And it edits a story no other dev spec loads, one that holds
// Nuxt's runtime config, which a component check used to read on mount (#1454).
const STORY_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'components', 'AutoImport.story.vue')
const STORY = '/story/app-components-autoimport-story-vue?variantId=_default'
const PLUGIN_PROVIDE = '/story/app-components-pluginprovide-story-vue?variantId=app-components-pluginprovide-story-vue-0'
const COMPLAINT = /NUXT_E\d+|\[Vue warn\]|\[nostics\]/

test.describe.configure({ mode: 'serial' })

test.describe('the Nuxt dev log', () => {
  let original: string

  test.beforeAll(() => {
    original = readFileSync(STORY_FILE, 'utf8')
  })

  test.afterAll(() => {
    writeFileSync(STORY_FILE, original)
  })

  test('has no line that reads as an error across page mounts and a story edit', async ({ page }, testInfo) => {
    expect(existsSync(LOG), `no ${LOG}: a reused dev server writes none, so stop it and run again`).toBe(true)
    // From the end of the first collection: a cold server is still collecting when
    // the spec starts, and the story is not on the page until it is done.
    await expect.poll(() => readFileSync(LOG, 'utf8').includes('Collect stories end'), { timeout: 180_000 }).toBe(true)
    const offset = statSync(LOG).size
    const since = () => stripVTControlCharacters(readFileSync(LOG).subarray(offset).toString('utf8'))

    await page.goto(STORY)
    const preview = page.getByTestId('preview-iframe').contentFrame()
    await expect(preview.getByText('Nuxt runtime config')).toBeVisible()

    await expect(async () => {
      writeFileSync(STORY_FILE, original.replace('Nuxt runtime config', 'Nuxt runtime config EDITED-BY-SPEC'))
      await expect(preview.getByText('EDITED-BY-SPEC')).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 60_000 })
    await expect.poll(() => since().includes('Collect stories end'), { message: 'the edit re-collected nothing in the log' }).toBe(true)

    // The story that holds `useNuxtApp()`: the state sync walked the whole app and
    // printed a `compilerOptions` warning per walk (#1457).
    await page.goto(PLUGIN_PROVIDE)
    await expect(page.getByTestId('preview-iframe').contentFrame().getByTestId('plugin-provided')).toBeVisible()
    // The complaints came just after a collection ended, so give them time to arrive.
    await page.waitForTimeout(3_000)

    const log = since()
    await testInfo.attach('dev log', { body: log, contentType: 'text/plain' })
    expect(log.split('\n').filter(line => COMPLAINT.test(line))).toEqual([])
  })
})
