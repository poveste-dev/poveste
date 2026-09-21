/*
 * Grid scroll, in two modes.
 *
 * Paging: after the initial fill, how long each scroll step takes until every
 * newly visible cell has mounted (#240). Initial fill pays one realm boot per
 * visible cell whatever the strategy; the pool's win is every cell that enters
 * the window afterwards, so this tells a cold-boot grid from a retargeting one.
 *
 * Fling: a constant velocity held for a fixed time, with no settle (#319).
 * Paging scrolls one viewport and then waits, about 0.5 px/ms, so every scroll
 * event takes the prompt path and #301's deferral during fast scroll is never
 * exercised. The fling sets `scrollTop = start + velocity × elapsed` each frame,
 * so it keeps its speed however slow the frames are; it added a fixed distance
 * per frame until #872, which slowed with the page and mostly never reached the
 * fast path. Every run records the velocity each scroll event measured, by #301's
 * own formula, so a fling that did not fling shows in its own output.
 *
 *   node bench/grid-scroll.mjs <baseURL> <storyId> [steps=6] [runs=5]
 *   node bench/grid-scroll.mjs <baseURL> <storyId> --fling [ms=400] [pxPerMs=12] [runs=5]
 */
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { median, range } from './grid-fill.mjs'
import { LOAF_INIT, LOAF_KEYS, summarizeLoaf } from './loaf.mjs'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const SCROLLER = '.poveste-story-variant-grid .overflow-y-auto'

// `FAST_PX_PER_MS` in `StoryVariantGrid.vue`.
const FAST_PX_PER_MS = 8

const INIT = `
  if (window === window.top) {
    window.__bench = { ready: 0, readyAt: [] }
    window.addEventListener('message', (e) => {
      if (e?.data?.type === '__poveste:sandbox-ready') {
        window.__bench.ready++
        window.__bench.readyAt.push(performance.now())
      }
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
        await page.evaluate((selector) => {
          const scroller = document.querySelector(selector) ?? document.scrollingElement
          scroller.scrollTop += scroller.clientHeight
        }, SCROLLER)
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

/**
 * `plant` puts `sandboxRafMs` of busy work in one sandbox's `requestAnimationFrame`
 * during the fling: the case `longtask` read as nothing, so the smoke check can
 * assert the instrument still sees it (#872). Never set for a measurement.
 */
export async function measureGridFling({ baseURL, storyId, ms = 400, pxPerMs = 12, runs = 5, plant, viewport = { width: 1280, height: 800 }, log = () => {} }) {
  const browser = await chromium.launch()
  const perRun = []
  try {
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      await page.addInitScript(INIT)
      await page.addInitScript(LOAF_INIT)
      await page.goto(`${baseURL}/story/${storyId}`, { waitUntil: 'commit' })
      await settle(page, () => window.__bench?.ready ?? 0, 3_000, 90_000)

      const fling = await page.evaluate(async ({ selector, ms, pxPerMs, plant }) => {
        const scroller = document.querySelector(selector)
        if (!scroller) {
          return { error: `no element matches ${selector}` }
        }
        const readyBefore = window.__bench.ready
        // Velocity per event, the way the grid's scroll handler computes it.
        const velocities = []
        let lastTop = scroller.scrollTop
        let lastT = performance.now()
        const onScroll = () => {
          const now = performance.now()
          velocities.push(now > lastT ? Math.abs(scroller.scrollTop - lastTop) / (now - lastT) : 0)
          lastTop = scroller.scrollTop
          lastT = now
        }
        scroller.addEventListener('scroll', onScroll, { passive: true })
        const start = scroller.scrollTop
        const end = scroller.scrollHeight - scroller.clientHeight
        const t0 = performance.now()
        let planted = false
        await new Promise((resolve) => {
          const tick = () => {
            const elapsed = performance.now() - t0
            scroller.scrollTop = Math.min(end, start + pxPerMs * elapsed)
            if (plant && !planted) {
              // Built inside the sandbox's own realm, so the frame attributes it
              // to the sandbox rather than to the host that asked for it.
              const sandbox = document.querySelector('[data-testid="preview-iframe"]')?.contentWindow
              if (sandbox) {
                planted = true
                sandbox.Function('ms', 'requestAnimationFrame(() => { const until = performance.now() + ms; while (performance.now() < until) {} })')(plant.sandboxRafMs)
              }
            }
            if (elapsed < ms && scroller.scrollTop < end) {
              requestAnimationFrame(tick)
            }
            else {
              resolve()
            }
          }
          requestAnimationFrame(tick)
        })
        const t1 = performance.now()
        scroller.removeEventListener('scroll', onScroll)
        // One more frame, so a planted callback queued on the last tick has run.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        return { t0, t1, flingMs: t1 - t0, distance: scroller.scrollTop - start, planted, readyBefore, readyDuringFling: window.__bench.ready - readyBefore, velocities }
      }, { selector: SCROLLER, ms, pxPerMs, plant })
      if (fling.error) {
        throw new Error(fling.error)
      }
      if (plant && !fling.planted) {
        throw new Error('asked to plant sandbox work, but the grid had no sandbox iframe to plant it in')
      }

      const readyAfter = await settle(page, () => window.__bench?.ready ?? 0, 1_500, 30_000)
      const lastReadyAt = await page.evaluate(() => window.__bench.readyAt.at(-1))
      // Frames that started while the fling ran, including the one it waited out.
      const loaf = summarizeLoaf(await page.evaluate(() => window.__loaf), { from: fling.t0, to: fling.t1 + 100 })
      const run = {
        scrollEvents: fling.velocities.length,
        fastEvents: fling.velocities.filter(v => v > FAST_PX_PER_MS).length,
        velocityMedian: fling.velocities.length ? Math.round(median(fling.velocities.map(v => v * 100)) / 100) : null,
        velocities: fling.velocities.map(v => Math.round(v * 10) / 10),
        distance: Math.round(fling.distance),
        readyTotal: readyAfter - fling.readyBefore,
        readyDuringFling: fling.readyDuringFling,
        flingMs: Math.round(fling.flingMs),
        settleMs: lastReadyAt > fling.t1 ? Math.round(lastReadyAt - fling.t1) : 0,
        ...loaf,
      }
      perRun.push(run)
      log(`  run ${i + 1}/${runs}: events=${run.scrollEvents} fast=${run.fastEvents} v=${run.velocityMedian}px/ms ready=${run.readyTotal} (during fling ${run.readyDuringFling}) fling=${run.flingMs}ms sandboxScript=${run.sandboxScriptMs}ms hostScript=${run.hostScriptMs}ms longFrames=${run.longFrames} worst=${run.worstFrameMs}ms`)
      await context.close()
    }
  }
  finally {
    await browser.close()
  }
  const result = { storyId, ms, pxPerMs, runs }
  for (const key of ['scrollEvents', 'fastEvents', 'velocityMedian', 'distance', 'readyTotal', 'readyDuringFling', 'flingMs', 'settleMs', ...LOAF_KEYS]) {
    result[key] = median(perRun.map(r => r[key]))
    result[`${key}Range`] = range(perRun.map(r => r[key]))
  }
  // The manipulation check, kept whole: a median hides a run that never flung.
  result.velocitiesPerRun = perRun.map(r => r.velocities)
  return result
}

async function main() {
  const args = process.argv.slice(2)
  const [baseURL, storyId] = args
  if (!baseURL || !storyId) {
    console.error('usage: node bench/grid-scroll.mjs <baseURL> <storyId> [steps] [runs]\n       node bench/grid-scroll.mjs <baseURL> <storyId> --fling [ms] [pxPerMs] [runs]')
    process.exit(2)
  }
  if (args[2] === '--fling') {
    const [ms = '400', pxPerMs = '12', runs = '5'] = args.slice(3)
    console.log(JSON.stringify(await measureGridFling({ baseURL, storyId, ms: Number(ms), pxPerMs: Number(pxPerMs), runs: Number(runs), log: console.error })))
    return
  }
  const [steps = '6', runs = '5'] = args.slice(2)
  const result = await measureGridScroll({ baseURL, storyId, steps: Number(steps), runs: Number(runs), log: console.error })
  console.log(JSON.stringify(result))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
