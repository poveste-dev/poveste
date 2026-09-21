/*
 * Runs the benchmarks end to end for one or more examples (#197): builds the
 * example's book with the bench stories included, serves it, and measures grid
 * fill at each variant count, a single cold sandbox boot, scrolling the largest
 * grid by paging and by fling (#319), and typing into a story that holds a
 * large object graph (#960).
 *
 *   node bench/run.mjs [--examples vue,svelte] [--sizes 10,100,1000] [--runs 7]
 *                      [--state-stories bench-state-64k,bench-state-control] [--json]
 *
 * The bench stories live in each example under `src/bench/` and are ignored by
 * the example's config unless POVESTE_BENCH=1, so normal books, dev servers and
 * the e2e story counts never see them.
 */
import { spawn } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { measureGridFill } from './grid-fill.mjs'
import { measureGridFling, measureGridScroll } from './grid-scroll.mjs'
import { measureSandbox } from './sandbox.mjs'
import { measureStateSync } from './state-sync.mjs'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const BASE_PORT = 4990

/** Size axis, then kind axis — see `bench/README.md`. */
export const STATE_STORIES = [
  'bench-state-0',
  'bench-state-512',
  'bench-state-8k',
  'bench-state-64k',
  'bench-state-control',
  'bench-state-plain',
  'bench-state-raw',
  'bench-state-shallow',
  'bench-state-ref',
  'bench-state-usetemplateref',
]

// Only `examples/vue` carries the state stories. `plugin-svelte` still syncs
// with the `wrote` flag rather than a baseline, so the Svelte figure would be
// of a different mechanism rather than the same one in another book (#960).
const STATE_AXIS_EXAMPLES = new Set(['vue'])

const env = { ...process.env, POVESTE_BENCH: '1' }

function sh(cmd, cmdArgs, options = {}) {
  return new Promise((resolve, reject) => {
    // Child stdout goes to *our* stderr: with `--json`, stdout is the report,
    // and a build's progress lines would land inside it.
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', process.stderr, 'inherit'], env, ...options })
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} ${cmdArgs.join(' ')} exited ${code}`))))
  })
}

async function waitForHttp(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    }
    catch {}
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`${url} did not come up in ${timeoutMs}ms`)
}

/**
 * Builds, serves and measures each example, and returns the report `--json` prints.
 * Exported so `smoke.spec.ts` runs the same instrument in-process.
 */
export async function runBench({ examples, sizes, runs, plant, stateStories = STATE_STORIES, log = console.error }) {
  const report = []

  for (const [i, example] of examples.entries()) {
    const port = BASE_PORT + i
    const baseURL = `http://localhost:${port}`
    const filter = `./examples/${example}`

    log(`\n=== ${example}: building with bench stories ===`)
    await sh('pnpm', ['--filter', filter, 'run', 'story:build'])

    log(`=== ${example}: serving on ${port} ===`)
    const server = spawn('pnpm', ['--filter', filter, 'exec', 'poveste', 'preview', '--port', String(port)], {
      stdio: 'ignore',
      env,
      detached: true,
    })
    try {
      await waitForHttp(`${baseURL}/`)

      for (const size of sizes) {
        log(`--- ${example} grid, V=${size}, ${runs} runs ---`)
        const r = await measureGridFill({ baseURL, storyId: `bench-grid-${size}`, runs, log })
        report.push({ example, kind: 'grid', size, ...r })
      }

      const largest = sizes[sizes.length - 1]
      log(`--- ${example} single sandbox, V=${largest} ---`)
      const s = await measureSandbox({ baseURL, storyId: `bench-grid-${largest}`, variantId: 'v1', runs: 5, log })
      report.push({ example, kind: 'sandbox', size: largest, ...s })

      // The largest grid only: a smaller one fits the window and does not scroll.
      log(`--- ${example} grid scroll, paging, V=${largest}, ${runs} runs ---`)
      const paging = await measureGridScroll({ baseURL, storyId: `bench-grid-${largest}`, runs, log })
      report.push({ example, kind: 'scroll', size: largest, ...paging })

      log(`--- ${example} grid scroll, fling, V=${largest}, ${runs} runs ---`)
      const fling = await measureGridFling({ baseURL, storyId: `bench-grid-${largest}`, runs, plant, log })
      report.push({ example, kind: 'fling', size: largest, ...fling })

      if (STATE_AXIS_EXAMPLES.has(example)) {
        for (const storyId of stateStories) {
          log(`--- ${example} state sync, ${storyId}, ${runs} runs ---`)
          const state = await measureStateSync({ baseURL, storyId, runs, log })
          report.push({ example, kind: 'state', ...state })
        }
      }
    }
    finally {
      // Detached so the whole pnpm → poveste tree goes with it.
      try {
        process.kill(-server.pid, 'SIGTERM')
      }
      catch {}
    }
  }

  return report
}

function printTable(report) {
  const pad = (s, n) => String(s ?? '—').padStart(n)
  console.log('\nexample    kind     V      cells  first   t10    last   sandbox  host   frames>50  blocked  last range')
  for (const r of report) {
    if (r.kind === 'grid') {
      console.log(`${r.example.padEnd(10)} grid   ${pad(r.size, 5)}  ${pad(r.cells, 5)}  ${pad(r.first, 5)}  ${pad(r.t10, 5)}  ${pad(r.last, 5)}  ${pad(r.sandboxScriptMs, 7)}  ${pad(r.hostScriptMs, 5)}  ${pad(r.longFrames, 9)}  ${pad(r.blocked, 7)}  ${r.lastRange}`)
    }
    else if (r.kind === 'sandbox') {
      console.log(`${r.example.padEnd(10)} sandbox${pad(r.size, 5)}      —  ${pad(r.median, 5)}      —      —        —      —          —        —  ${r.range}`)
    }
  }

  const scrolls = report.filter(r => r.kind === 'scroll' || r.kind === 'fling')
  if (scrolls.length) {
    console.log('\nexample    kind     V      ms     range        mounts  range    fast events  px/ms  sandbox  host   frames>50  worst')
    for (const r of scrolls) {
      if (r.kind === 'scroll') {
        console.log(`${r.example.padEnd(10)} scroll ${pad(r.size, 5)}  ${pad(r.stepMs, 5)}  ${pad(r.stepRange, 11)}  ${pad(r.newReadyPerStep, 6)}  ${pad('per step', 8)}  —`)
      }
      else {
        console.log(`${r.example.padEnd(10)} fling  ${pad(r.size, 5)}  ${pad(r.flingMs, 5)}  ${pad(r.flingMsRange, 11)}  ${pad(r.readyTotal, 6)}  ${pad(r.readyTotalRange, 8)}  ${pad(`${r.fastEvents} of ${r.scrollEvents}`, 11)}  ${pad(r.velocityMedian, 5)}  ${pad(r.sandboxScriptMs, 7)}  ${pad(r.hostScriptMs, 5)}  ${pad(r.longFrames, 9)}  ${pad(r.worstFrameMs, 5)}`)
      }
    }
  }
  const states = report.filter(r => r.kind === 'state')
  if (states.length) {
    console.log('\nexample    story                        wall   per key   busy  syncs  sandbox   host  frames>50  worst  quiet  wall range')
    for (const r of states) {
      console.log(`${r.example.padEnd(10)} ${r.storyId.padEnd(27)}  ${pad(r.wallMs, 5)}  ${pad(r.perKeystrokeMs, 7)}  ${pad(r.busyPerKeystrokeMs, 5)}  ${pad(r.syncs, 5)}  ${pad(r.sandboxScriptMs, 7)}  ${pad(r.hostScriptMs, 5)}  ${pad(r.longFrames, 9)}  ${pad(r.worstFrameMs, 5)}  ${pad(r.quiet, 5)}  ${r.wallRange}`)
    }
  }

  console.log('\n(ms; medians over fresh browser contexts; 1280×800 viewport)')
  console.log('("sandbox"/"host" = long-animation-frame script time by windowAttribution; "blocked" = long-task time over 50ms, which misses rendering-step work)')
  console.log('(scroll: ms per paged step after the 1.5s settle; fling: its time-based duration, mounts across fling and settle, measured px/ms per event)')
  console.log('(state: 10 keystrokes 120ms apart, so 1.2s of the wall is deliberate pacing — "busy" is per keystroke with that taken off; "syncs" is the sandbox\'s own STATE_SYNC count and is the load-independent column)')
}

async function main() {
  const args = process.argv.slice(2)
  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`)
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback
  }
  const report = await runBench({
    examples: opt('examples', 'vue,svelte').split(',').map(s => s.trim()).filter(Boolean),
    sizes: opt('sizes', '10,100,1000').split(',').map(Number),
    runs: Number(opt('runs', '7')),
    stateStories: opt('state-stories', STATE_STORIES.join(',')).split(',').map(s => s.trim()).filter(Boolean),
  })
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
  }
  else {
    printTable(report)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
