/*
 * Single sandbox: cold boot of one sandbox document to SANDBOX_READY (#197).
 *
 * No grid, no app chrome — this is the per-realm fixed cost that a grid pays
 * once per cell, serially. `--profile` captures a V8 CPU profile of the first
 * run and prints the top self-time frames, so an O(V) term has a name.
 *
 *   node bench/sandbox.mjs <baseURL> <storyId> <variantId> [runs=5] [--profile]
 */
import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { median, range } from './grid-fill.mjs'

// stdout is the interface: results are JSON or a table for the terminal.
/* eslint-disable no-console */

const INIT = `
  window.__ready = null
  window.addEventListener('message', (e) => {
    if (e?.data?.type === '__poveste:sandbox-ready' && window.__ready === null) window.__ready = performance.now()
  })
`

function topFrames(profile, limit = 20) {
  const self = new Map()
  for (const node of profile.nodes) self.set(node.id, { node, hits: 0 })
  for (const id of profile.samples) {
    const entry = self.get(id)
    if (entry) entry.hits++
  }
  const total = profile.samples.length || 1
  return [...self.values()]
    .filter(e => e.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((e) => {
      const f = e.node.callFrame
      const url = (f.url || '').split('/').pop()
      return `${(e.hits / total * 100).toFixed(1).padStart(5)}%  ${f.functionName || '(anonymous)'}  ${url}:${f.lineNumber}`
    })
}

export async function measureSandbox({ baseURL, storyId, variantId, runs = 5, profile = false, log = () => {} }) {
  const browser = await chromium.launch()
  const times = []
  try {
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({ viewport: { width: 400, height: 400 } })
      const page = await context.newPage()
      await page.addInitScript(INIT)

      let session
      if (profile && i === 0) {
        session = await context.newCDPSession(page)
        await session.send('Profiler.enable')
        await session.send('Profiler.start')
      }

      await page.goto(`${baseURL}/__sandbox.html?storyId=${storyId}&variantId=${variantId}`, { waitUntil: 'commit' })
      try {
        await page.waitForFunction(() => window.__ready !== null, undefined, { timeout: 60_000 })
        times.push(Math.round(await page.evaluate(() => window.__ready)))
      }
      catch {
        times.push(null)
      }

      if (session) {
        const { profile: prof } = await session.send('Profiler.stop')
        writeFileSync('bench/sandbox.cpuprofile', JSON.stringify(prof))
        log(`--- CPU profile, run 1 (${prof.samples.length} samples) → bench/sandbox.cpuprofile ---`)
        log(topFrames(prof).join('\n'))
      }

      await context.close()
    }
  }
  finally {
    await browser.close()
  }
  return { storyId, variantId, runs, times, median: median(times), range: range(times) }
}

async function main() {
  const args = process.argv.slice(2)
  const profile = args.includes('--profile')
  const [baseURL, storyId, variantId, runs = '5'] = args.filter(a => a !== '--profile')
  if (!baseURL || !storyId || !variantId) {
    console.error('usage: node bench/sandbox.mjs <baseURL> <storyId> <variantId> [runs] [--profile]')
    process.exit(2)
  }
  const result = await measureSandbox({ baseURL, storyId, variantId, runs: Number(runs), profile, log: console.error })
  console.log(JSON.stringify(result))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
