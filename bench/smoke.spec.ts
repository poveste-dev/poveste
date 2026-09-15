import { describe, expect, it } from 'vitest'
import { assertNoProblems } from '../scripts/assert-no-problems.ts'
import { runBench } from './run.mjs'

// One book, one size, one run (#666). Not a measurement: a shared runner's
// timings are noise, so only their existence is asserted. The failure this is
// for is the quiet one. If POVESTE_BENCH stops letting `src/bench/**` past
// `storyIgnored`, the grid has no cells, every timing is null, and `run.mjs`
// still finishes with a report full of dashes.
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

  return problems
}

describe('reportProblems', () => {
  it('reports a grid that filled no cells', () => {
    const report = [{ kind: 'grid', cells: 0, first: null, last: null }, { kind: 'sandbox', median: 120 }]

    expect(reportProblems(report)).toContainEqual(expect.stringContaining('the grid filled 0 cells'))
  })
})

describe('runBench', () => {
  it('measures something over one book, one size and one run', async () => {
    const report = await runBench({ examples: ['vue3'], sizes: [10], runs: 1 })

    assertNoProblems({ problems: reportProblems(report), remedy: 'The bench ran and measured nothing: `run.mjs` finished, but the report holds no numbers.', notes: [] })
  })
})
