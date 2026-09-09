/*
 * One asserted run of the bench (#666).
 *
 *   node bench/smoke.mjs
 *
 * `bench/` is the instrument behind this project's performance claims — the
 * #197 before/after, #328, #595, and the re-measurement that closed #331 not
 * planned — and nothing ran it. An instrument nobody exercises can stop working
 * quietly, and the failure surfaces when someone needs a number, which is
 * always the worst moment to discover the baseline is not reproducible.
 *
 * One book, one size, one run. That is not a measurement and is not meant to
 * be: the README's own advice is that a single run proves nothing, ~26% spread
 * on this suite before the #197 fixes. What this asserts is that numbers came
 * out at all.
 *
 * The failure it exists for is the quiet one. The bench stories reach the book
 * through `storyIgnored` in the example config, which lets them in only under
 * POVESTE_BENCH — so if that stops working the grid has no cells, every timing
 * is null, and `run.mjs` still exits 0 with a report full of dashes.
 */
import { spawn } from 'node:child_process'
import process from 'node:process'

// This script's output is a person reading CI, same as the check scripts.
/* eslint-disable no-console */

const RUN = ['bench/run.mjs', '--examples', 'vue3', '--sizes', '10', '--runs', '1', '--json']

function reportProblems(report) {
  const problems = []

  const grid = report.find(r => r.kind === 'grid')
  if (!grid) {
    problems.push('the report has no grid result')
  }
  else {
    if (!(grid.cells > 0)) {
      problems.push(`the grid filled ${grid.cells} cells, so nothing was measured — check that POVESTE_BENCH still lets src/bench/** past storyIgnored`)
    }
    for (const key of ['first', 'last']) {
      if (!Number.isFinite(grid[key])) {
        problems.push(`grid.${key} is ${JSON.stringify(grid[key])} rather than a number`)
      }
    }
  }

  const sandbox = report.find(r => r.kind === 'sandbox')
  if (!sandbox) {
    problems.push('the report has no sandbox result')
  }
  else if (!Number.isFinite(sandbox.median)) {
    problems.push(`sandbox.median is ${JSON.stringify(sandbox.median)} rather than a number`)
  }

  return problems
}

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

async function main() {
  const child = spawn(process.execPath, RUN, { stdio: ['ignore', 'pipe', 'inherit'] })
  child.stdout.setEncoding('utf8')
  let stdout = ''
  child.stdout.on('data', chunk => (stdout += chunk))

  const code = await new Promise(resolve => child.on('exit', resolve))
  if (code !== 0) {
    fail(`bench/run.mjs exited ${code}`)
  }

  let report
  try {
    report = JSON.parse(stdout)
  }
  catch {
    fail(`bench/run.mjs printed no JSON report:\n${stdout.slice(0, 800)}`)
  }

  const problems = reportProblems(report)
  if (problems.length) {
    fail(`the bench ran and measured nothing:\n${problems.map(p => `  - ${p}`).join('\n')}`)
  }

  const grid = report.find(r => r.kind === 'grid')
  const sandbox = report.find(r => r.kind === 'sandbox')
  console.log(`✅ The bench still measures: ${grid.cells} cells filled in ${grid.last}ms (first at ${grid.first}ms), one cold sandbox at ${sandbox.median}ms. The numbers are not asserted, only their existence.`)
}

main()
