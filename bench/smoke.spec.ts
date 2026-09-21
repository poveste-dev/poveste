import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assertNoProblems } from '../scripts/checks/support/assert-no-problems.ts'
import { runBench } from './run.mjs'
import { measureStateSync } from './state-sync.mjs'

// One book, one size, one run (#666). The size is the largest grid, because the
// scroll modes run on it and a smaller one fits the window. Not a measurement:
// a shared runner's timings are noise, so only their existence is asserted. The
// failure this is for is the quiet one. If POVESTE_BENCH stops letting `src/bench/**` past
// `storyIgnored`, the grid has no cells, every timing is null, and `run.mjs`
// still finishes with a report full of dashes.
// Longer than any one script a real retarget runs, so only the plant can reach it.
const PLANTED_MS = 150

/** The two ends of the state axis. The other eight cost minutes and prove no more here. */
const STATE_SMOKE_STORIES = ['bench-state-control', 'bench-state-64k']

/**
 * The floor the size axis has to clear over the control. Measured on an M3 Pro
 * it is ~670× — 3ms a keystroke against 2021ms — so this catches an instrument
 * that has gone blind rather than a slow runner, and a slow runner widens the
 * gap, since the control's cost is the typing pacing and does not move.
 */
const STATE_GAP = 10

/** The one story allowed `useTemplateRef`, because #959 is what it is for. */
const USE_TEMPLATE_REF_STORY = 'StateBenchUseTemplateRef.story.vue'
const USE_TEMPLATE_REF_ID = 'bench-state-usetemplateref'
const BENCH_STORIES = new URL('../examples/vue/src/bench/', import.meta.url)

function reportProblems(report: Array<Record<string, any>>, stories: string[] = STATE_SMOKE_STORIES): string[] {
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

  const state = new Map(report.filter(r => r.kind === 'state').map(r => [r.storyId, r]))
  for (const storyId of stories) {
    const result = state.get(storyId)
    if (!result) {
      problems.push(`the report has no state result for ${storyId}`)
    }
    else if (!result.found) {
      problems.push(`${storyId} had no input to type into, so nothing was measured — check that POVESTE_BENCH still lets src/bench/** past storyIgnored`)
    }
    else if (!result.typed) {
      problems.push(`${storyId} never finished the burst, so nothing was measured — it did not give the main thread back`)
    }
    else if (result.readonlyWarnings > 0 && storyId !== USE_TEMPLATE_REF_ID) {
      // Dev-only: Vue compiles the warning out, so a built book cannot raise
      // this and the file check below is what holds the rule there. The one
      // story exempted is the one placed to produce them (#959).
      problems.push(`${storyId} logged ${result.readonlyWarnings} readonly-ref warnings, so it measured #959's loop rather than the walk`)
    }
  }

  const control = state.get('bench-state-control')
  const graph = state.get('bench-state-64k')
  if (control?.typed && graph?.typed) {
    // A control measuring as free is the expected case, so the floor keeps the
    // ratio finite rather than turning the comparison off.
    const floor = Math.max(control.busyPerKeystrokeMs, 1)
    if (!(graph.busyPerKeystrokeMs >= STATE_GAP * floor)) {
      problems.push(`a keystroke cost bench-state-64k ${graph.busyPerKeystrokeMs}ms against the control's ${control.busyPerKeystrokeMs}ms, under the ${STATE_GAP}× the instrument exists to see`)
    }
  }

  return problems
}

/**
 * A story's `<script setup>` with its comments removed.
 *
 * Whole-file text will not do: every story on the size axis carries a comment
 * warning against `useTemplateRef`, so matching the raw source fails the check
 * on the very lines that state the rule.
 */
export function scriptOf(source: string): string {
  // Every block, not the first: a story may carry a plain `<script>` beside its
  // `<script setup>`, and reading one of the two is a false clean bill.
  return [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map(block => block[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

/** Story files whose `<script setup>` names `useTemplateRef`, rather than a comment doing so. */
function useTemplateRefStories(dir: URL): string[] {
  return readdirSync(dir)
    .filter(file => file.endsWith('.story.vue'))
    .filter(file => /\buseTemplateRef\b/.test(scriptOf(readFileSync(new URL(file, dir), 'utf8'))))
    .sort()
}

describe('reportProblems', () => {
  it('reports a grid that filled no cells', () => {
    const report = [{ kind: 'grid', cells: 0, first: null, last: null }, { kind: 'sandbox', median: 120 }]

    expect(reportProblems(report)).toContainEqual(expect.stringContaining('the grid filled 0 cells'))
  })

  const state = [
    { kind: 'state', storyId: 'bench-state-control', found: true, typed: true, busyPerKeystrokeMs: 3, readonlyWarnings: 0 },
    { kind: 'state', storyId: 'bench-state-64k', found: true, typed: true, busyPerKeystrokeMs: 2021, readonlyWarnings: 0 },
  ]
  const measured = [{ kind: 'grid', cells: 18, first: 500, last: 2300 }, { kind: 'sandbox', median: 120 }, { kind: 'scroll', stepMs: 900 }, ...state]
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

  it('reports a state story that never reached the book', () => {
    const missing = measured.map(r => (r.storyId === 'bench-state-64k' ? { ...r, found: false } : r))

    expect(reportProblems([...missing, fling])).toEqual([expect.stringContaining('bench-state-64k had no input to type into')])
  })

  it('reports a state axis that measured no more than the control', () => {
    const blind = measured.map(r => (r.storyId === 'bench-state-64k' ? { ...r, busyPerKeystrokeMs: 6 } : r))

    expect(reportProblems([...blind, fling])).toEqual([expect.stringContaining('cost bench-state-64k 6ms against the control\'s 3ms')])
  })

  it('reports a state story that never gave the main thread back', () => {
    const stuck = measured.map(r => (r.storyId === 'bench-state-64k' ? { ...r, typed: false, busyPerKeystrokeMs: null } : r))

    expect(reportProblems([...stuck, fling])).toEqual([expect.stringContaining('bench-state-64k never finished the burst')])
  })

  it('reports a size-axis story that logged a readonly-ref warning', () => {
    const readonly = measured.map(r => (r.storyId === 'bench-state-64k' ? { ...r, readonlyWarnings: 3 } : r))

    expect(reportProblems([...readonly, fling])).toEqual([expect.stringContaining('bench-state-64k logged 3 readonly-ref warnings')])
  })

  // It is the story placed to produce them, so its warnings are the point.
  it('allows readonly-ref warnings from the useTemplateRef story', () => {
    const loop = { kind: 'state', storyId: 'bench-state-usetemplateref', found: true, typed: true, busyPerKeystrokeMs: 2059, readonlyWarnings: 100 }

    expect(reportProblems([...measured, fling, loop], [...STATE_SMOKE_STORIES, 'bench-state-usetemplateref'])).toEqual([])
  })
})

describe('scriptOf', () => {
  it('drops a line comment that names useTemplateRef', () => {
    const story = '<script lang="ts" setup>\n// Never `useTemplateRef` here.\nconst graph = ref(null)\n</script>'

    expect(scriptOf(story)).not.toMatch(/useTemplateRef/)
  })

  it('drops a block comment that names useTemplateRef', () => {
    const story = '<script setup>\n/* useTemplateRef is readonly in a dev build */\nconst graph = ref(null)\n</script>'

    expect(scriptOf(story)).not.toMatch(/useTemplateRef/)
  })

  it('reads a second script block, not only the first', () => {
    const story = '<script>\nexport default {}\n</script>\n<script setup>\nconst graph = useTemplateRef(\'graph\')\n</script>'

    expect(scriptOf(story)).toMatch(/\buseTemplateRef\b/)
  })

  it('keeps the call when the story really makes one', () => {
    const story = '<script setup>\nimport { useTemplateRef } from \'vue\'\nconst graph = useTemplateRef(\'graph\')\n</script>'

    expect(scriptOf(story)).toMatch(/\buseTemplateRef\b/)
  })
})

describe('measureStateSync', () => {
  // `every` on an empty array is true, so a loop that never runs would report
  // found, typed and quiet over a browser that never opened.
  it.each([0, -1, 1.5, Number('abc')])('refuses runs=%s, which would measure nothing', async (runs) => {
    await expect(measureStateSync({ baseURL: 'http://localhost:1', storyId: 'bench-state-control', runs }))
      .rejects
      .toThrow(/positive integer/)
  })
})

describe('the state stories', () => {
  // Someone will eventually modernise these, and every number off a modernised
  // size-axis story would silently be a measurement of #959's loop. The built
  // book cannot say so — Vue compiles the warning out — so the source does.
  it('call useTemplateRef in one story only, the one placed to hold #959 failing', () => {
    expect(useTemplateRefStories(BENCH_STORIES)).toEqual([USE_TEMPLATE_REF_STORY])
  })
})

describe('runBench', () => {
  it('measures something over one book, one size and one run', async () => {
    const report = await runBench({ examples: ['vue'], sizes: [1000], runs: 1, plant: { sandboxRafMs: PLANTED_MS }, stateStories: STATE_SMOKE_STORIES })

    assertNoProblems({ problems: reportProblems(report), remedy: 'The bench ran and measured nothing: `run.mjs` finished, but the report holds no numbers.', notes: [] })
  })
})
