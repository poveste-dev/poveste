/*
 * Runs the grid-fill benchmark end to end for one or more examples (#197):
 * builds the example's book with the bench stories included, serves it, and
 * measures grid fill at each variant count plus a single cold sandbox boot.
 *
 *   node bench/run.mjs [--examples vue3,svelte5] [--sizes 10,100,1000] [--runs 7] [--json]
 *
 * The bench stories live in each example under `src/bench/` and are ignored by
 * the example's config unless POVESTE_BENCH=1, so normal books, dev servers and
 * the e2e story counts never see them.
 */
import { spawn } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { measureGridFill } from './grid-fill.mjs'
import { measureSandbox } from './sandbox.mjs'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const BASE_PORT = 4990

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
export async function runBench({ examples, sizes, runs, log = console.error }) {
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

      log(`--- ${example} single sandbox, V=${sizes[sizes.length - 1]} ---`)
      const s = await measureSandbox({ baseURL, storyId: `bench-grid-${sizes[sizes.length - 1]}`, variantId: 'v1', runs: 5, log })
      report.push({ example, kind: 'sandbox', size: sizes[sizes.length - 1], ...s })
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
  console.log('\nexample    kind     V      cells  first   t10    last   blocked  last range')
  for (const r of report) {
    if (r.kind === 'grid') {
      console.log(`${r.example.padEnd(10)} grid   ${pad(r.size, 5)}  ${pad(r.cells, 5)}  ${pad(r.first, 5)}  ${pad(r.t10, 5)}  ${pad(r.last, 5)}  ${pad(r.blocked, 7)}  ${r.lastRange}`)
    }
    else {
      console.log(`${r.example.padEnd(10)} sandbox${pad(r.size, 5)}      —  ${pad(r.median, 5)}      —      —        —  ${r.range}`)
    }
  }
  console.log('\n(ms; medians over fresh browser contexts; 1280×800 viewport; "blocked" = long-task time over 50ms)')
}

async function main() {
  const args = process.argv.slice(2)
  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`)
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback
  }
  const report = await runBench({
    examples: opt('examples', 'vue3,svelte5').split(',').map(s => s.trim()).filter(Boolean),
    sizes: opt('sizes', '10,100,1000').split(',').map(Number),
    runs: Number(opt('runs', '7')),
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
