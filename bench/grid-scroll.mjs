/*
 * Grid scroll: after the initial fill, how long each scroll step takes until
 * every newly visible cell has mounted (#240).
 *
 * Initial fill pays one realm boot per visible cell whatever the strategy; the
 * pool's win is every cell that enters the window afterwards, so this is the
 * number that tells a cold-boot grid from a retargeting one.
 *
 *   node bench/grid-scroll.mjs <baseURL> <storyId> [steps=6] [runs=5]
 */
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { median, range } from './grid-fill.mjs'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const INIT = `
  if (window === window.top) {
    window.__bench = { ready: 0, reloads: 0 }
    window.addEventListener('message', (e) => {
      if (e?.data?.type === '__poveste:sandbox-ready') window.__bench.ready++
    })
  }
`

async function settle(page, readFn, settleMs, maxMs) {
  const start = Date.now()
  let last = -1
  let stableSince = Date.now()
  while (Date.now() - stableSince < settleMs && Date.now() - start < maxMs) {
    const value = await page.evaluate(readFn)
    if (value !== last) {
      last = value
      stableSince = Date.now()
    }
    await new Promise(r => setTimeout(r, 100))
  }
  return last
}

export async function measureGridScroll({ baseURL, storyId, steps = 6, runs = 5, viewport = { width: 1280, height: 800 }, log = () => {} }) {
  const browser = await chromium.launch()
  const perRun = []
  try {
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      await page.addInitScript(INIT)
      await page.goto(`${baseURL}/story/${storyId}`, { waitUntil: 'commit' })
      await settle(page, () => window.__bench?.ready ?? 0, 3_000, 90_000)

      // Tag every iframe so reuse can be told from recreation after scrolling.
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="preview-iframe"]').forEach((el, n) => {
          el.dataset.benchTag = String(n)
        })
      })
      const initialIframes = await page.locator('[data-testid="preview-iframe"]').count()

      const stepTimes = []
      for (let s = 0; s < steps; s++) {
        const before = await page.evaluate(() => window.__bench.ready)
        const t0 = Date.now()
        await page.evaluate(() => {
          const scroller = document.querySelector('.poveste-story-variant-grid .overflow-y-auto')
            ?? document.scrollingElement
          scroller.scrollTop += scroller.clientHeight
        })
        // New cells report ready as they mount; wait for the count to stop moving.
        const after = await settle(page, () => window.__bench?.ready ?? 0, 1_500, 30_000)
        stepTimes.push({ ms: Date.now() - t0 - 1_500, newReady: after - before })
      }

      const survivors = await page.evaluate(() => document.querySelectorAll('[data-testid="preview-iframe"][data-bench-tag]').length)
      const finalIframes = await page.locator('[data-testid="preview-iframe"]').count()
      const run = {
        initialIframes,
        finalIframes,
        reusedIframes: survivors,
        stepMs: median(stepTimes.map(s => s.ms)),
        newReadyPerStep: median(stepTimes.map(s => s.newReady)),
      }
      perRun.push(run)
      log(`  run ${i + 1}/${runs}: iframes ${initialIframes}→${finalIframes} (reused ${survivors}) step=${run.stepMs}ms newReady/step=${run.newReadyPerStep}`)
      await context.close()
    }
  }
  finally {
    await browser.close()
  }
  return {
    storyId,
    steps,
    runs,
    stepMs: median(perRun.map(r => r.stepMs)),
    stepRange: range(perRun.map(r => r.stepMs)),
    newReadyPerStep: median(perRun.map(r => r.newReadyPerStep)),
    reusedIframes: median(perRun.map(r => r.reusedIframes)),
    iframes: median(perRun.map(r => r.finalIframes)),
  }
}

async function main() {
  const [baseURL, storyId, steps = '6', runs = '5'] = process.argv.slice(2)
  if (!baseURL || !storyId) {
    console.error('usage: node bench/grid-scroll.mjs <baseURL> <storyId> [steps] [runs]')
    process.exit(2)
  }
  const result = await measureGridScroll({ baseURL, storyId, steps: Number(steps), runs: Number(runs), log: console.error })
  console.log(JSON.stringify(result))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
