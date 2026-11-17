// Opens a story's Accessibility tab in a running `poveste dev` and fails unless the
// check finishes.
//
// The chrome imports axe-core from inside `node_modules`, where Vite serves a
// dependency as it is rather than pre-bundling it, and axe-core's UMD build has no
// default export. Only an npm install reaches that path: the workspace links the app
// and pnpm's layout lets the scan see it, so the tab failed nowhere CI looked.
//
// Usage: node a11y-runs.mjs <origin> <story path>

import process from 'node:process'
import { chromium } from '@playwright/test'

const [origin, path] = process.argv.slice(2)
if (!origin || !path) {
  console.error('usage: a11y-runs.mjs <origin> <story path>')
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
try {
  const page = await browser.newPage()
  await page.goto(`${origin}${path}${path.includes('?') ? '&' : '?'}tab=a11y`)
  const panel = page.locator('[data-testid="story-a11y"]:is([data-status="done"], [data-status="error"])')
  // Long enough for a cold dependency pass and the reload it can bring.
  await panel.waitFor({ timeout: 60_000 })
  if (await panel.getAttribute('data-status') === 'error') {
    console.error(`the Accessibility tab at ${path} failed: ${(await panel.locator('[data-slot="error"]').textContent())?.trim()}`)
    process.exitCode = 1
  }
  else {
    console.log(`the Accessibility tab at ${path} ran axe-core`)
  }
}
catch (error) {
  console.error(`the Accessibility tab at ${path} did not finish`)
  console.error(error.message)
  process.exitCode = 1
}
finally {
  await browser.close()
}
