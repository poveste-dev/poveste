import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/*
 * Auto-docs, read off the rendered docs tab (#1159). `AutoDocsButton`'s props are
 * an interface extending another from a separate file, with defaults from
 * `withDefaults` that agree with one tag and contradict another.
 *
 * Runs against the built book, where `poveste build` extracted the docs, and
 * against `poveste dev`, where opening the tab is what starts extraction.
 */
const STORY = '/story/auto-docs-button?tab=docs'

test.describe('the docs of a story\'s component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY)
  })

  function row(page: import('@playwright/test').Page, prop: string) {
    return page.locator('[data-component="AutoDocsButton"] [data-slot="props"]').locator(`[data-prop="${prop}"]`)
  }

  test('lists props from the interface and the one it extends', async ({ page }) => {
    const props = page.locator('[data-component="AutoDocsButton"] [data-slot="props"] [data-prop]')

    await expect(props).toHaveCount(4, { timeout: 60_000 })
    await expect(props.evaluateAll(rows => rows.map(r => r.getAttribute('data-prop')).sort())).resolves.toEqual(['label', 'level', 'size', 'variant'])
  })

  test('shows a prop\'s description, type and that it is required', async ({ page }) => {
    const label = row(page, 'label')

    await expect(label).toContainText('The text on the button.', { timeout: 60_000 })
    await expect(label).toContainText('string')
    await expect(label.locator('[data-slot="required"]')).toBeVisible()
  })

  test('shows the code\'s default', async ({ page }) => {
    await expect(row(page, 'size')).toContainText('md', { timeout: 60_000 })
    await expect(row(page, 'level')).toContainText('2')
  })

  // The tag says 3, the code says 2: dev marks it, the built book only shows what runs.
  test('marks a default the tag contradicts, in dev only', async ({ page }, testInfo) => {
    const conflict = row(page, 'level').locator('[data-slot="default-conflict"]')
    await expect(row(page, 'level')).toBeVisible({ timeout: 60_000 })

    if (testInfo.project.name.endsWith(':dev')) {
      await expect(conflict).toHaveAttribute('title', /says 3/)
    }
    else {
      await expect(conflict).toHaveCount(0)
    }
    await expect(row(page, 'size').locator('[data-slot="default-conflict"]')).toHaveCount(0)
  })

  test('marks a deprecated prop and hides an internal one', async ({ page }) => {
    await expect(row(page, 'variant').locator('[data-slot="deprecated"]')).toContainText('use `tone`', { timeout: 60_000 })
    await expect(row(page, 'secret')).toHaveCount(0)
  })

  test('lists the slot and the event', async ({ page }) => {
    const component = page.locator('[data-component="AutoDocsButton"]')

    await expect(component.locator('[data-slot="slots"] [data-slot-name="icon"]')).toContainText('Shown before the label.', { timeout: 60_000 })
    await expect(component.locator('[data-slot="events"] [data-event="press"]')).toContainText('MouseEvent')
  })
})

// A story's own `autoDocs` (#1398). Both stories import `AutoDocsButton`, which the
// story above documents in full.
test.describe('a story that chooses its own table', () => {
  test('shows only the sections it names', async ({ page }) => {
    await page.goto('/story/auto-docs-props-only?tab=docs')
    const component = page.locator('[data-component="AutoDocsButton"]')

    await expect(component.locator('[data-slot="props"] [data-prop="label"]')).toBeVisible({ timeout: 60_000 })
    await expect(component.locator('[data-slot="slots"]')).toHaveCount(0)
    await expect(component.locator('[data-slot="events"]')).toHaveCount(0)
  })

  test('shows no table when it turns it off, and its components are never read', async ({ page }, testInfo) => {
    if (testInfo.project.name.endsWith(':dev')) {
      // The server answers over the HMR socket; its answer for this story is empty.
      const answered = new Promise<string>((resolve) => {
        page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
          if (String(payload).includes('poveste:docgen-result') && String(payload).includes('"auto-docs-off"')) {
            resolve(String(payload))
          }
        }))
      })
      await page.goto('/story/auto-docs-off?tab=docs')
      expect(JSON.parse(await answered).data).toEqual({ storyId: 'auto-docs-off', components: {} })
    }
    else {
      // What `poveste build` extracted holds the other stories' docs and none for this one.
      const assets = join(dirname(fileURLToPath(import.meta.url)), '..', '.poveste', 'dist', 'assets')
      const data = readdirSync(assets).filter(file => /component-docs-data[-_].*\.js$/.test(file)).map(file => readFileSync(join(assets, file), 'utf8')).join('')
      expect(data).toContain('"auto-docs-button"')
      expect(data).not.toContain('"auto-docs-off"')
      await page.goto('/story/auto-docs-off?tab=docs')
    }
    await expect(page.locator('[data-component]')).toHaveCount(0)
  })
})

// What the Docs tab says before it has a table, read in `poveste dev`, where the
// answer comes over the HMR socket (#1400). The socket is routed so the test
// decides when, and with what, the server's answer arrives.
test.describe('the Docs tab before it has a table', () => {
  const devOnly = (testInfo: import('@playwright/test').TestInfo) =>
    test.skip(!testInfo.project.name.endsWith(':dev'), 'a built book has its docs before the tab opens')

  async function routeDocgen(page: import('@playwright/test').Page, answer: (data: { storyId: string, components: object }) => object | undefined) {
    await page.routeWebSocket(/.*/, (socket) => {
      const server = socket.connectToServer()
      server.onMessage((message) => {
        const frame = typeof message === 'string' ? JSON.parse(message) : undefined
        if (frame?.event !== 'poveste:docgen-result') {
          socket.send(message)
          return
        }
        const data = answer(frame.data)
        if (data) {
          socket.send(JSON.stringify({ ...frame, data }))
        }
      })
    })
  }

  test('says it is reading component types while the answer is on its way', async ({ page }, testInfo) => {
    devOnly(testInfo)
    await routeDocgen(page, () => undefined)
    await page.goto(STORY)

    await expect(page.getByTestId('docs-pending')).toContainText('Reading component types', { timeout: 60_000 })
    await expect(page.locator('[data-component]')).toHaveCount(0)
  })

  test('says why auto-docs is off, in the words the terminal uses', async ({ page }, testInfo) => {
    devOnly(testInfo)
    const off = 'Auto-docs is off: it reads component types with TypeScript, which this book does not have. Install `typescript@6` in the book to turn it on, or set `autoDocs: false` to turn it off without this message.'
    await routeDocgen(page, data => ({ storyId: data.storyId, components: {}, off }))
    await page.goto(STORY)

    await expect(page.getByTestId('docs-off')).toHaveText(off, { timeout: 60_000 })
    await expect(page.getByTestId('docs-pending')).toHaveCount(0)
  })
})

// A built book's docs data is a chunk loaded on first use: until it arrived, the tab
// said "No documentation available", then showed the table (#1400).
test('a built book says nothing about its docs until their data has loaded', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.endsWith(':dev'), 'dev answers over the socket, covered above')
  let release!: () => void
  const released = new Promise<void>(resolve => (release = resolve))
  let held!: () => void
  const holding = new Promise<void>(resolve => (held = resolve))
  await page.route(/component-docs-data-.*\.js/, async (route) => {
    held()
    await released
    await route.continue()
  })
  await page.goto(STORY)
  await holding
  await expect(page.locator('.poveste-story-docs')).toBeVisible()

  await expect(page.getByText('No documentation available')).toHaveCount(0)
  await expect(page.getByTestId('docs-pending')).toHaveCount(0)

  release()
  await expect(page.locator('[data-component="AutoDocsButton"]')).toBeVisible()
})

// A built book used to put every story's tables in one chunk, which the first Docs tab
// downloaded whole. Each component is now a chunk of its own, loaded by the stories that
// import it (#1429).
test('a built book downloads the opened story\'s docs data, not the book\'s', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.endsWith(':dev'), 'dev answers over the socket')
  const assets = join(dirname(fileURLToPath(import.meta.url)), '..', '.poveste', 'dist', 'assets')
  const COMPONENT_CHUNK = /__resolved__virtual_component-docs-data_\d+-[\w-]+\.js$/
  const fetched: string[] = []
  page.on('request', (request) => {
    const chunk = COMPONENT_CHUNK.exec(request.url())?.[0]
    if (chunk) {
      fetched.push(chunk)
    }
  })

  await page.goto(STORY)
  await expect(page.locator('[data-component="AutoDocsButton"] [data-slot="props"] [data-prop]')).toHaveCount(4, { timeout: 60_000 })

  expect(readdirSync(assets).filter(file => COMPONENT_CHUNK.test(file)).length).toBeGreaterThan(1)
  expect(fetched).toHaveLength(1)
  expect(readFileSync(join(assets, fetched[0]!), 'utf8')).toContain('The text on the button.')
})

// A tab left open across a deploy asks for a chunk the server no longer has: the tab
// stopped at "loading" for good, with an unhandled rejection.
test('a built book whose docs chunk fails to load says it has no documentation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.endsWith(':dev'), 'dev answers over the socket')
  await page.route(/__resolved__virtual_component-docs-data_\d+-[\w-]+\.js$/, route => route.abort())
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto(STORY)

  await expect(page.getByText('No documentation available')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('[data-component]')).toHaveCount(0)
  expect(errors).toEqual([])
})
