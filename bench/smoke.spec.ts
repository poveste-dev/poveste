import { describe, expect, it } from 'vitest'
import { assertNoProblems } from '../scripts/checks/support/assert-no-problems.ts'
import { runBench } from './run.mjs'

// One book, one size, one run (#666). The size is the largest grid, because the
// scroll modes run on it and a smaller one fits the window. Not a measurement:
// a shared runner's timings are noise, so only their existence is asserted. The
// failure this is for is the quiet one. If POVESTE_BENCH stops letting `src/bench/**` past
// `storyIgnored`, the grid has no cells, every timing is null, and `run.mjs`
// still finishes with a report full of dashes.
// Longer than any one script a real retarget runs, so only the plant can reach it.
const PLANTED_MS = 150

function reportProblems(report: Array<Record<string, any>>): string[] {
  const problems: string[] = []

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

  // A fling over a scroller that never scrolled, or found no cells, mounts
  // nothing and still reports a time for delivering its frames.
  const fling = report.find(r => r.kind === 'fling')
  if (!fling) {
    problems.push('the report has no fling result')
  }
  else {
    if (!(fling.readyTotal > 0)) {
      problems.push(`the fling mounted ${fling.readyTotal} cells, so the grid did not scroll — check the scroller selector in bench/grid-scroll.mjs`)
    }
    // A time-based fling holds its speed on a slow runner. One whose events stay
    // under #301's threshold is not exercising the path the mode exists for.
    if (!(fling.fastEvents > 0)) {
      problems.push(`none of the fling's ${fling.scrollEvents} scroll events reached 8 px/ms (median ${fling.velocityMedian}), so it measured the prompt path, not a fling`)
    }
    // The work `longtask` read as nothing (#872): planted in a sandbox's rAF, it has
    // to come back as sandbox script time.
    if (!(fling.longestSandboxScriptMs >= PLANTED_MS)) {
      problems.push(`${PLANTED_MS}ms planted in a sandbox's requestAnimationFrame read as a longest sandbox script of ${fling.longestSandboxScriptMs}ms, so the bench cannot see rendering-step work`)
    }
  }

  if (!report.some(r => r.kind === 'scroll' && Number.isFinite(r.stepMs))) {
    problems.push('the report has no paging scroll result with a step time')
  }

  return problems
}

describe('reportProblems', () => {
  it('reports a grid that filled no cells', () => {
    const report = [{ kind: 'grid', cells: 0, first: null, last: null }, { kind: 'sandbox', median: 120 }]

    expect(reportProblems(report)).toContainEqual(expect.stringContaining('the grid filled 0 cells'))
  })

  const measured = [{ kind: 'grid', cells: 18, first: 500, last: 2300 }, { kind: 'sandbox', median: 120 }, { kind: 'scroll', stepMs: 900 }]
  const fling = { kind: 'fling', readyTotal: 40, flingMs: 400, scrollEvents: 24, fastEvents: 20, velocityMedian: 12, sandboxScriptMs: 400, longestSandboxScriptMs: 160 }

  it('reports a fling that mounted nothing', () => {
    expect(reportProblems([...measured, { ...fling, readyTotal: 0 }])).toEqual([expect.stringContaining('the fling mounted 0 cells')])
  })

  it('reports a fling that never reached the fast-scroll threshold', () => {
    expect(reportProblems([...measured, { ...fling, fastEvents: 0, velocityMedian: 1.5 }])).toEqual([expect.stringContaining('none of the fling\'s 24 scroll events reached 8 px/ms')])
  })

  it('reports planted sandbox work that the bench did not see', () => {
    expect(reportProblems([...measured, { ...fling, longestSandboxScriptMs: 35 }])).toEqual([expect.stringContaining('read as a longest sandbox script of 35ms')])
  })
})

describe('runBench', () => {
  it('measures something over one book, one size and one run', async () => {
    const report = await runBench({ examples: ['vue'], sizes: [1000], runs: 1, plant: { sandboxRafMs: PLANTED_MS } })

    assertNoProblems({ problems: reportProblems(report), remedy: 'The bench ran and measured nothing: `run.mjs` finished, but the report holds no numbers.', notes: [] })
  })
})
