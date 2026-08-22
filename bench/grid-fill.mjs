/*
 * Grid fill: how long until each cell of a grid story has mounted (#197).
 *
 * Records the arrival time of every SANDBOX_READY message in the app window,
 * in fresh browser contexts, and reports medians with ranges — a single run on
 * this suite has a measured ~26% spread.
 *
 *   node bench/grid-fill.mjs <baseURL> <storyId> [runs=7]
 */
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const INIT = `
  if (window === window.top) {
    window.__bench = { ready: [], blocked: 0, longTasks: 0 }
    window.addEventListener('message', (e) => {
      if (e?.data?.type === '__poveste:sandbox-ready') window.__bench.ready.push(performance.now())
    })
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__bench.longTasks++
          window.__bench.blocked += Math.max(0, entry.duration - 50)
        }
      }).observe({ type: 'longtask', buffered: true })
    } catch {}
  }
`

export function median(values) {
  const sorted = values.filter(v => v !== null && v !== undefined).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = (sorted.length - 1) / 2
  return Math.round((sorted[Math.floor(mid)] + sorted[Math.ceil(mid)]) / 2)
}

export function range(values) {
  const sorted = values.filter(v => v !== null && v !== undefined).sort((a, b) => a - b)
  return sorted.length ? `${sorted[0]}–${sorted[sorted.length - 1]}` : null
}

/**
 * Waits until the ready count has been stable for `settleMs` — the window may
 * hold fewer cells than a story has variants, so there is no fixed target.
 */
async function settle(page, settleMs = 5_000, maxMs = 90_000) {
  const start = Date.now()
  let last = -1
  let stableSince = Date.now()
  while (Date.now() - stableSince < settleMs && Date.now() - start < maxMs) {
    const count = await page.evaluate(() => window.__bench?.ready.length ?? 0)
    if (count !== last) {
      last = count
      stableSince = Date.now()
    }
    await new Promise(r => setTimeout(r, 250))
  }
}

export async function measureGridFill({ baseURL, storyId, runs = 7, viewport = { width: 1280, height: 800 }, log = () => {} }) {
  const browser = await chromium.launch()
  const results = []
  try {
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      await page.addInitScript(INIT)
      await page.goto(`${baseURL}/story/${storyId}`, { waitUntil: 'commit' })
      await settle(page)

      const data = await page.evaluate(() => window.__bench)
      const ready = data.ready.slice().sort((a, b) => a - b)
      const at = n => (ready[n - 1] !== undefined ? Math.round(ready[n - 1]) : null)
      const run = { cells: ready.length, first: at(1), t10: at(10), last: at(ready.length), blocked: Math.round(data.blocked) }
      results.push(run)
      log(`  run ${i + 1}/${runs}: cells=${run.cells} first=${run.first} t10=${run.t10} last=${run.last} blocked=${run.blocked}ms`)
      await context.close()
    }
  }
  finally {
    await browser.close()
  }

  const col = key => results.map(r => r[key])
  return {
    storyId,
    runs,
    cells: results[0]?.cells ?? 0,
    first: median(col('first')),
    t10: median(col('t10')),
    last: median(col('last')),
    blocked: median(col('blocked')),
    lastRange: range(col('last')),
  }
}

async function main() {
  const [baseURL, storyId, runs = '7'] = process.argv.slice(2)
  if (!baseURL || !storyId) {
    console.error('usage: node bench/grid-fill.mjs <baseURL> <storyId> [runs]')
    process.exit(2)
  }
  const result = await measureGridFill({ baseURL, storyId, runs: Number(runs), log: console.error })
  console.log(JSON.stringify(result))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
