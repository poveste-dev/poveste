# bench

Repeatable grid-fill measurements for the sandbox iframe path (#197). The numbers that attributed the cost there, and the before/after for its fixes, came from these scripts — keep using the same instrument so results stay comparable.

```bash
node bench/run.mjs                          # vue3 + svelte5, V=10/100/1000, 7 runs each
node bench/run.mjs --examples vue3 --runs 3 # quick look
node bench/run.mjs --json > after.json      # machine-readable, diff against a baseline
```

`run.mjs` builds each example with `POVESTE_BENCH=1` (which lets the bench stories into the book), serves it on 4990+, measures, and kills the server. Each script also runs on its own against any server:

| script | measures |
| --- | --- |
| `grid-fill.mjs <baseURL> <storyId> [runs]` | arrival time of each cell's `SANDBOX_READY` in the app window; long-task blocking |
| `sandbox.mjs <baseURL> <storyId> <variantId> [runs] [--profile]` | one cold sandbox boot; `--profile` writes a CPU profile and prints top self-time frames |

## Bench stories

`examples/vue3/src/bench/` and `examples/svelte5/src/bench/` carry `GridBench{1,10,100,1000}` — identical 48px buttons, only the variant count differs. That axis is the point: a cell renders one variant, so per-cell cost that scales with the story's *total* variant count is plugin-side work, and seeing it in one framework but not another localizes it further. The example configs ignore `src/bench/**` unless `POVESTE_BENCH=1`, so the e2e story-count specs and anyone browsing the examples never see them.

## Reading the numbers

- Medians over fresh browser contexts, ranges reported. A single run on this suite had a measured ~26% spread before the #197 fixes, ~4% after; one run proves nothing.
- Same machine for before/after. Headless Chromium, 1280×800 — an 18-cell window for the 200px grid.
- `first`, `t10`, `last` are ms from navigation to the 1st/10th/last cell mounting. `blocked` is main-thread long-task time over the 50ms threshold.
- Cells boot serially (same-origin iframes share the main thread), so `last ≈ cells × single-sandbox` is the sanity check; a big gap means cells are doing work beyond a cold boot.

## Reference (M3 Pro, `conformance-huge-grid`, V=1000, 18 cells)

| | first | t10 | last | blocked |
| --- | --- | --- | --- | --- |
| before #239/#241 | 1923 | 2491 | 6968 | 1151 |
| after | 996 | 1390 | 2152 | 43 |
