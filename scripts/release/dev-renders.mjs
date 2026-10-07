// Opens a story in a running `poveste dev` and fails unless its preview renders.
//
// `poveste dev` over an npm install has shipped blank twice with every check
// green (#1060, #1134): the build was smoke-tested and the e2e suites serve built
// books from a pnpm workspace, where both breaks are invisible. The sidebar loads
// and every request answers 200 either way, so the only assertion that means
// anything is the story itself, inside the preview frame.
//
// Usage: node dev-renders.mjs <origin> <story path> <text the story shows>

import process from 'node:process'
import { chromium } from '@playwright/test'

const [origin, path, expected] = process.argv.slice(2)
if (!origin || !path || !expected) {
  console.error('usage: dev-renders.mjs <origin> <story path> <text the story shows>')
  process.exit(2)
}

// The first request also triggers dependency optimization, which can take a
// while on a cold cache; the server answers before that settles.
const deadline = Date.now() + 60_000
while (true) {
  const status = await fetch(origin).then(response => response.status, () => 0)
  if (status === 200) {
    break
  }
  if (Date.now() > deadline) {
    console.error(`${origin} did not answer within 60s`)
    process.exit(1)
  }
  await new Promise(resolve => setTimeout(resolve, 500))
}

const browser = await chromium.launch()
const vues = new Set()
// Printed only on failure: what the browser said, which the server log cannot.
const said = []
// Also printed only on failure, timed from the first navigation: what a re-run
// cannot tell apart, a page that loaded the story list before collection ended
// and missed the update that carried the rest (#1218) from a broken render.
const started = Date.now()
const timeline = []
const at = event => timeline.push(`${String(Date.now() - started).padStart(6)}ms ${event}`)
let page
try {
  page = await browser.newPage()
  page.on('pageerror', error => said.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      said.push(`console.${message.type()}: ${message.text()}`)
    }
  })
  page.on('load', () => at('page load'))
  page.on('requestfailed', request => at(`request failed: ${request.url()} (${request.failure()?.errorText})`))
  page.on('response', (response) => {
    if (response.status() >= 400) {
      at(`${response.status()} ${response.url()}`)
    }
    else if (response.url().includes('poveste-stories')) {
      at(`stories list served: ${new URL(response.url()).pathname}${new URL(response.url()).search}`)
    }
  })
  // The HMR traffic that decides whether a page holds the whole story list.
  page.on('websocket', (socket) => {
    at(`websocket ${new URL(socket.url()).pathname}`)
    const note = direction => (frame) => {
      const text = String(frame.payload)
      const named = text.match(/"(full-reload)"|"event":"(poveste:[\w-]+)"|"acceptedPath":"([^"]*poveste-stories[^"]*)"/)
      if (named && !text.includes('stories-loading-progress')) {
        at(`ws ${direction} ${named[1] ?? named[2] ?? `update ${named[3]}`}${text.includes('"generation"') ? ` ${text.match(/"generation":-?\d+/)?.[0] ?? ''}` : ''}`)
      }
    }
    socket.on('framereceived', note('<-'))
    socket.on('framesent', note('->'))
  })
  // Diagnostic only: which Vue modules were served, across the host and the frame.
  page.on('response', (response) => {
    const { pathname } = new URL(response.url())
    if (/\/vue\/dist\/vue\.runtime[^/]*\.js$|\/deps\/(?:poveste-)?vue\.js$/.test(pathname)) {
      vues.add(pathname)
    }
  })

  await page.goto(`${origin}${path}`)
  // A dependency found late reloads the page once; the locator keeps polling.
  await page.frameLocator('[data-testid="preview-iframe"]').getByText(expected).first().waitFor({ timeout: 60_000 })
  console.log(`rendered "${expected}"; Vue served as ${[...vues].join(', ') || '(none matched)'}`)
}
catch (error) {
  console.error(`the story at ${path} did not render "${expected}" in the preview frame`)
  console.error(`Vue served as ${[...vues].join(', ') || '(none matched)'}`)
  console.error(error.message)
  const frame = await page?.$('[data-testid="preview-iframe"]').then(handle => handle?.contentFrame())
  console.error(`at ${page?.url()}: ${await page?.locator('iframe').count()} iframe(s); the frame shows ${JSON.stringify((await frame?.evaluate(() => (document.querySelector('#app') ?? document.body)?.textContent))?.slice(0, 200) ?? null)}`)
  for (const line of said.slice(-20)) {
    console.error(`  ${line}`)
  }
  const listed = await page?.locator('[data-testid="story-list-item"]').count()
  const loading = await page?.locator('.poveste-initial-loading').count()
  console.error(`the story list showed ${listed} item(s); the initial loading screen was ${loading ? 'up' : 'gone'}`)
  console.error('timeline:')
  for (const line of timeline) {
    console.error(`  ${line}`)
  }
  process.exitCode = 1
}
finally {
  await browser.close()
}
