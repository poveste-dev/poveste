/*
 * State sync: what one keystroke costs a story holding a large object graph (#960).
 *
 * Types a fixed burst into the story's input and reports the wall time until the
 * page goes quiet again, the frames over 50ms spent there, and the longest of
 * them. Typing is real — Playwright key events through the sandbox frame, not an
 * assignment to `el.value` and a synthetic `input`. That costs absolute time a
 * synthetic harness does not pay, and that is the point: the state walk runs on
 * the main thread the next keystroke needs.
 *
 * Quiet is read from the sandbox's own STATE_SYNC messages rather than from a
 * timer. The count is load-independent, so it is the field to compare across
 * machines; every ms here moves with the runner.
 *
 *   node bench/state-sync.mjs <baseURL> <storyId> [runs=5]
 */
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { median, range } from './grid-fill.mjs'
import { LOAF_INIT, LOAF_KEYS, summarizeLoaf } from './loaf.mjs'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const SANDBOX = '[data-testid="preview-iframe"]'
const INPUT = '.bench-state-input'

/** Ten characters, none needing a modifier, 120ms apart — an ideal of 1.2s. */
const BURST = 'benchstate'
const KEY_DELAY_MS = 120

const BOOT_TIMEOUT = 60_000
const TYPE_TIMEOUT = 180_000
const QUIET_MS = 1_000
const QUIET_TIMEOUT = 60_000
const READ_TIMEOUT = 10_000

/** #959's symptom, and dev-only: Vue compiles the warning out of a built book. */
const READONLY = /target is readonly/

const INIT = `
  if (window === window.top) {
    window.__state = { syncs: 0 }
    window.addEventListener('message', (e) => {
      if (e?.data?.type === '__poveste:state-sync') window.__state.syncs++
    })
  }
`

/**
 * `page.evaluate` against a page that is not giving the main thread back never
 * answers and has no timeout of its own, so every read here is bounded — or the
 * instrument hangs on precisely the story it exists to measure.
 *
 * `null` means the page did not answer in time, which is itself activity.
 */
function read(page, fn, ms = READ_TIMEOUT) {
  const value = page.evaluate(fn)
  value.catch(() => {})
  // Cleared rather than left to fire: `waitForQuiet` polls every 100ms, and a
  // timer that outlives its race holds the event loop open after the browser
  // has closed — measured at a ten-second wait before the process would exit.
  let timer
  const deadline = new Promise((resolve) => {
    timer = setTimeout(resolve, ms, null)
  })
  return Promise.race([value, deadline]).finally(() => clearTimeout(timer))
}

/** The same read, for a value the run cannot go on without. */
async function readOrThrow(page, fn) {
  const value = await read(page, fn)
  if (value === null) {
    throw new Error(`the page did not answer within ${READ_TIMEOUT}ms`)
  }
  return value
}

/**
 * Whether the page stopped working within `maxMs`, where working is a sandbox
 * still reporting state or the host still spending over 50ms in a frame.
 *
 * `false` is a result, not a timeout to retry: a story that never settles is
 * what `bench-state-usetemplateref` is placed to show.
 */
async function waitForQuiet(page, { quietMs = QUIET_MS, maxMs = QUIET_TIMEOUT } = {}) {
  const start = Date.now()
  let last = -1
  let stableSince = Date.now()
  while (Date.now() - start < maxMs) {
    const activity = await read(page, () => (window.__state?.syncs ?? 0) + (window.__loaf?.frames.length ?? 0))
    if (activity === null || activity !== last) {
      last = activity ?? -1
      stableSince = Date.now()
    }
    else if (Date.now() - stableSince >= quietMs) {
      return true
    }
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}

/**
 * A run that produced no timing, in the shape of one that did, so a story that
 * never reached the book or never let go of the main thread reports rather than
 * raises out of the middle of a suite.
 */
function nothingMeasured(fields) {
  return {
    found: true,
    typed: false,
    wallMs: null,
    perKeystrokeMs: null,
    busyPerKeystrokeMs: null,
    syncs: null,
    syncsPerKeystroke: null,
    quiet: false,
    settledBeforeTyping: false,
    readonlyWarnings: 0,
    ...summarizeLoaf(null),
    ...fields,
  }
}

export async function measureStateSync({ baseURL, storyId, runs = 5, burst = BURST, keyDelayMs = KEY_DELAY_MS, viewport = { width: 1280, height: 800 }, log = () => {} }) {
  // A loop that never runs leaves `results` empty, and `every` on an empty array
  // is true — so `found`, `typed` and `quiet` would all report success over a
  // browser that never opened, which is the one failure this script exists to
  // catch. `Number('abc')` reaching here as NaN is how that happens.
  if (!Number.isInteger(runs) || runs < 1) {
    throw new TypeError(`runs must be a positive integer, got ${String(runs)}`)
  }

  const browser = await chromium.launch()
  const keystrokes = burst.length
  const idealMs = keystrokes * keyDelayMs
  const results = []
  try {
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      let readonlyWarnings = 0
      page.on('console', (message) => {
        if (READONLY.test(message.text())) readonlyWarnings++
      })
      await page.addInitScript(INIT)
      await page.addInitScript(LOAF_INIT)
      await page.goto(`${baseURL}/story/${storyId}`, { waitUntil: 'commit' })

      const input = page.frameLocator(SANDBOX).locator(INPUT)
      // A story that never reached the book has no input to type into. That is
      // the quiet failure `smoke.spec.ts` is placed for (#666), so it is
      // reported as a run with nothing in it rather than raised from in here.
      try {
        await input.waitFor({ state: 'visible', timeout: BOOT_TIMEOUT })
      }
      catch {
        results.push({ ...nothingMeasured({ found: false, settledBeforeTyping: false, readonlyWarnings }) })
        log(`  run ${i + 1}/${runs}: no ${INPUT} in the sandbox — did ${storyId} reach the book?`)
        await context.close()
        continue
      }
      // Mount and first sync are not what is being measured; they are what the
      // burst has to start from.
      const settledBeforeTyping = await waitForQuiet(page, { maxMs: QUIET_TIMEOUT })

      let before, typedAt, quiet, after
      try {
        // Focusing is already an action a locked page cannot acknowledge, so it
        // belongs inside the guard rather than ahead of it.
        await input.click({ timeout: BOOT_TIMEOUT })
        before = await readOrThrow(page, () => ({ now: performance.now(), syncs: window.__state.syncs }))
        await input.pressSequentially(burst, { delay: keyDelayMs, timeout: TYPE_TIMEOUT })
        typedAt = await readOrThrow(page, () => performance.now())
        quiet = await waitForQuiet(page)
        after = await readOrThrow(page, () => ({ syncs: window.__state.syncs, loaf: window.__loaf }))
      }
      catch (error) {
        // A page that never gives the main thread back cannot acknowledge a key
        // event either, so the burst times out rather than finishing slowly.
        // That is a result — it is what #959 looks like from outside — and the
        // run says so instead of taking the suite down with it.
        results.push(nothingMeasured({ settledBeforeTyping, readonlyWarnings }))
        log(`  run ${i + 1}/${runs}: the burst did not finish (${error.message.split('\n')[0]}) — ${storyId} never gave the main thread back`)
        await context.close()
        continue
      }

      const frames = (after.loaf?.frames ?? []).filter(frame => frame.startTime >= before.now)
      const lastFrameEnd = frames.reduce((end, frame) => Math.max(end, frame.startTime + frame.duration), 0)
      const wallMs = Math.round(Math.max(typedAt, lastFrameEnd) - before.now)
      const syncs = after.syncs - before.syncs

      const run = {
        found: true,
        typed: true,
        wallMs,
        perKeystrokeMs: Math.round(wallMs / keystrokes),
        // The pacing is deliberate waiting, so a story that costs nothing reads
        // as costing nothing rather than as costing the delay.
        busyPerKeystrokeMs: Math.round(Math.max(0, wallMs - idealMs) / keystrokes),
        syncs,
        syncsPerKeystroke: Math.round(syncs / keystrokes),
        quiet,
        settledBeforeTyping,
        readonlyWarnings,
        ...summarizeLoaf(after.loaf, { from: before.now }),
      }
      results.push(run)
      log(`  run ${i + 1}/${runs}: wall=${run.wallMs}ms perKey=${run.perKeystrokeMs}ms busy=${run.busyPerKeystrokeMs}ms syncs=${run.syncs} frames>50=${run.longFrames} worst=${run.worstFrameMs}ms quiet=${run.quiet}`)
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
    found: results.every(r => r.found),
    typed: results.every(r => r.typed),
    keystrokes,
    keyDelayMs,
    idealMs,
    wallMs: median(col('wallMs')),
    perKeystrokeMs: median(col('perKeystrokeMs')),
    busyPerKeystrokeMs: median(col('busyPerKeystrokeMs')),
    syncs: median(col('syncs')),
    syncsPerKeystroke: median(col('syncsPerKeystroke')),
    quiet: results.every(r => r.quiet),
    quietRuns: results.filter(r => r.quiet).length,
    settledBeforeTyping: results.every(r => r.settledBeforeTyping),
    readonlyWarnings: results.reduce((total, r) => total + r.readonlyWarnings, 0),
    ...Object.fromEntries(LOAF_KEYS.map(key => [key, median(col(key))])),
    wallRange: range(col('wallMs')),
  }
}

async function main() {
  const [baseURL, storyId, runs = '5'] = process.argv.slice(2)
  const runCount = Number(runs)
  if (!baseURL || !storyId || !Number.isInteger(runCount) || runCount < 1) {
    console.error('usage: node bench/state-sync.mjs <baseURL> <storyId> [runs]')
    process.exit(2)
  }
  const result = await measureStateSync({ baseURL, storyId, runs: runCount, log: console.error })
  console.log(JSON.stringify(result))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
