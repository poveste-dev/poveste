// Opens a story's Docs tab in a running `poveste dev` and fails unless the tab
// says why auto-docs is off.
//
// A book without TypeScript logged the reason and showed "Reading component
// types…" forever, because nothing answered the tab's request while auto-docs
// was off (#1502). The workspace hoists TypeScript, so only an installed book
// reaches that path.
//
// With `--prop`, it fails unless the tab shows that prop's row instead: a book with no
// TypeScript, or with TypeScript 7, is read with Poveste's TypeScript 6 (#1464).
//
// Usage: node docs-off.mjs <origin> <story path> <text the tab shows> [--prop]

import process from 'node:process'
import { chromium } from '@playwright/test'

const [origin, path, expected, mode] = process.argv.slice(2)
const prop = mode === '--prop'
if (!origin || !path || !expected) {
  console.error('usage: docs-off.mjs <origin> <story path> <text the tab shows>')
  process.exit(2)
}

const deadline = Date.now() + 60_000
while (await fetch(origin).then(response => response.status, () => 0) !== 200) {
  if (Date.now() > deadline) {
    console.error(`${origin} did not answer within 60s`)
    process.exit(1)
  }
  await new Promise(resolve => setTimeout(resolve, 500))
}

const browser = await chromium.launch()
let page
try {
  page = await browser.newPage()
  await page.goto(`${origin}${path}`)
  // Long enough for a cold dependency pass and the reload it can bring; the
  // answer itself takes no time, since no extractor starts.
  if (prop) {
    // A first read starts a type checker, which takes longer than an answer that it is off.
    await page.locator(`[data-slot="props"] [data-prop="${expected}"]`).waitFor({ timeout: 120_000 })
    console.log(`the Docs tab documents "${expected}"`)
  }
  else {
    await page.getByTestId('docs-off').filter({ hasText: expected }).waitFor({ timeout: 60_000 })
    console.log(`the Docs tab says "${expected}"`)
  }
}
catch (error) {
  console.error(`the Docs tab at ${path} did not ${prop ? 'document' : 'say'} "${expected}"`)
  console.error(error.message)
  console.error(`it shows: ${JSON.stringify((await page?.locator('[data-testid="docs-pending"], [data-testid="docs-off"]').allTextContents())?.join(' | ') ?? null)}`)
  process.exitCode = 1
}
finally {
  await browser.close()
}
