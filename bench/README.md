# bench

Repeatable measurements for the sandbox iframe path: filling and scrolling a grid (#197, #319), and syncing state into one story (#960). The numbers that attributed the cost there, and the before/after for its fixes, came from these scripts — keep using the same instrument so results stay comparable.

```bash
node bench/run.mjs                          # vue + svelte, V=10/100/1000, 7 runs each
node bench/run.mjs --examples vue --runs 3 # quick look
node bench/run.mjs --json > after.json      # machine-readable, diff against a baseline
pnpm bench:smoke                            # one asserted run: does the instrument still work
```

The state axis is the long pole: six of its ten stories hold 65,535 objects and cost about 25s a run each, so the default adds roughly twenty minutes to a `vue` run at seven runs. `--state-stories bench-state-control,bench-state-64k` is the two-ended form, and what the smoke run uses.

`run.mjs` builds each example with `POVESTE_BENCH=1` (which lets the bench stories into the book), serves it on 4990+, measures, and kills the server. Each script also runs on its own against any server:

| script | measures |
| --- | --- |
| `grid-fill.mjs <baseURL> <storyId> [runs]` | arrival time of each cell's `SANDBOX_READY` in the app window; main-thread script time from long animation frames, split host and sandbox |
| `sandbox.mjs <baseURL> <storyId> <variantId> [runs] [--profile]` | one cold sandbox boot; `--profile` writes a CPU profile and prints top self-time frames |
| `grid-scroll.mjs <baseURL> <storyId> [steps] [runs]` | paging: time per viewport-sized scroll step until the newly visible cells mount, and how many iframes were reused (#240) |
| `grid-scroll.mjs <baseURL> <storyId> --fling [ms] [pxPerMs] [runs]` | fling: a constant velocity held for a fixed time with no settle, then the cells mounted, the velocity each scroll event measured, and long-animation-frame script time over the fling (#319, #872) |
| `state-sync.mjs <baseURL> <storyId> [runs]` | typing: ten real keystrokes 120ms apart into the story's input, the wall time until the page goes quiet, the sandbox's own STATE_SYNC count, and the frames over 50ms it spent there (#960) |

## Bench stories

`examples/vue/src/bench/` and `examples/svelte/src/bench/` carry `GridBench{1,10,100,1000}` — identical 48px buttons, only the variant count differs. That axis is the point: a cell renders one variant, so per-cell cost that scales with the story's *total* variant count is plugin-side work, and seeing it in one framework but not another localizes it further. The example configs ignore `src/bench/**` unless `POVESTE_BENCH=1`, so the e2e story-count specs and anyone browsing the examples never see them.

`examples/vue/src/bench/` carries a second axis, for state sync (#960): `StateBench*`, each an `<input v-model="state.text">` beside a binary tree of plain objects, and each measured by typing into that input. Two dimensions cross there. **Size** — `bench-state-{0,512,8k,64k}`, holding 1 to 65,535 objects behind one writable `ref(null)` template ref — asks what the walk costs per object. **Kind**, all at 65,535 — `bench-state-{control,plain,raw,shallow,ref,usetemplateref}` — asks what a binding's *form* is worth, from no graph at all to `markRaw` and `shallowRef`.

Two things about those stories are load-bearing and neither is visible in a diff.

**One file per case, never one file with a variant each.** `addImplicitState` registers every top-level `<script setup>` binding of a *story* (#959), so a graph declared for a variant that is not on screen is walked all the same. Measured with the patched walkers described below, before this bench existed: a single file holding the plain, `markRaw` and `shallowRef` graphs reported 12,582,939 visits and 6.3s on the *control* variant, which holds no graph at all.

**The size axis uses a writable `ref(null)`, never `useTemplateRef`.** `useTemplateRef` returns a readonly ref in a dev build, the state setter's write is refused, and the sandbox never settles — that is #959, and every number off such a story measures the loop rather than the walk. `bench-state-usetemplateref` exists to hold it failing and is the only story that may call it. Vue compiles the warning out of a built book, so nothing at runtime can catch a second story being modernised into that shape; `smoke.spec.ts` reads the files instead.

Only `examples/vue` carries this axis, and the reason is that the cost has one home. What the bench measures is `addImplicitState` registering every top-level `<script setup>` binding of a story, and that function exists in `plugin-vue` alone.

`examples/nuxt` and `examples/quasar` would run the identical code — `plugin-nuxt` depends on `@poveste/plugin-vue` and the Quasar book uses it directly — so a mirror there re-measures this walk plus that framework's boot, and tells you nothing further about the walk itself.

`examples/svelte` and `examples/sveltekit` have no equivalent to mirror. `plugin-svelte` never imports `toRawDeep`, and its only state-sync path, `syncState`, is reachable only through Svelte 4's `$capture_state` via `getLegacyStateApi` — the books are on Svelte 5, where it is dead code. A Svelte story's state holds what `initState` put there and nothing else, so there is no graph behind a binding to walk. #960 gives a different reason, that `plugin-svelte` "still uses the `wrote` flag rather than a baseline"; that flag is `applyState`'s return value in `poveste-shared` and `plugin-vue`'s own bridge uses it the same way, so it is not what separates them.

## Does it still run

`pnpm bench:smoke` is one book, one size, one run, and it asserts only that numbers came out. CI runs it on every push that can move a book, because until #666 nothing ran these scripts at all — and an instrument nobody exercises fails at the moment someone needs a measurement, which is usually mid-argument about a regression.

The failure it is placed for is the quiet one. The bench stories reach the book through `storyIgnored` in the example config, and if that stops letting them in the grid has no cells, every timing is null, and `run.mjs` still exits 0 with a report full of dashes.

It also checks the instrument can see what it exists to see. The smoke run plants a 150ms busy loop in one sandbox's `requestAnimationFrame` during the fling and fails unless the longest sandbox script comes back at 150ms or more; a real retarget's longest is about 30ms, so only the plant reaches it. And it fails if no scroll event of the fling reached #301's 8 px/ms, since that fling would have measured the prompt path.

The state axis adds three of its own, and they are the three ways it goes quietly wrong. The stories have to have **reached the book** — a story that did not leaves no input to type into, and `state-sync.mjs` reports a run with nulls rather than raising, so the report would otherwise read as dashes again. `bench-state-64k` has to cost at least **ten times** the control per keystroke — the measured gap is about 670×, so the floor catches an instrument that has gone blind, not a slow runner, and a slow runner widens it because the control's cost is the typing pacing and does not move. And **only `StateBenchUseTemplateRef.story.vue` may call `useTemplateRef`**, which is read from the files rather than from the run, for the reason in the previous section.

It is not a measurement, and no baseline is committed. `--json` is for diffing two runs on one machine; a number from a shared CI runner would invite comparison against the M3 Pro figures below, which is exactly the comparability the paragraph above is trying to protect.

## Reading the numbers

- Medians over fresh browser contexts, ranges reported. A single run on this suite had a measured ~26% spread before the #197 fixes, ~4% after; one run proves nothing.
- Same machine for before/after. Headless Chromium, 1280×800 — an 18-cell window for the 200px grid.
- `first`, `t10`, `last` are ms from navigation to the 1st/10th/last cell mounting.
- Main-thread cost is read from long animation frames in the top window (#872). `sandbox` and `host` are script time split by `windowAttribution` (`descendant` and `self`), `longestSandboxScriptMs` is the longest single sandbox script, and `longFrames`/`worstFrameMs` count and size the frames over 50ms. Sandboxes are same-origin and share the host's main thread, and much of their work runs in a frame's rendering steps, which is why long tasks are the wrong instrument. Measured on `bench-grid-1000` during a fling with 150ms planted in a sandbox rAF, `longtask` reported one 62ms entry while long animation frames reported six frames over 50ms with 460ms of sandbox script. On an idle page `longtask` did report the same plant, so it is not blind to rAF work, only to most of it during scrolling. `blocked`, long-task time over 50ms, is still reported beside it for older reports.
- Cells boot serially (same-origin iframes share the main thread), so `last ≈ cells × single-sandbox` is the sanity check; a big gap means cells are doing work beyond a cold boot.
- The two scroll modes run on the largest grid only, since a smaller one fits the window. Paging settles for 1.5s after each step, about 0.5 px/ms, so it never reaches the fast-scroll path #301 added and cannot tell the two apart. Fling is the mode that does: in its report, `readyTotal` is the cells mounted across the fling and the settle, and `flingMs` is how long the page took to deliver the frames.
- A fling holds a velocity for a time: each frame sets `scrollTop = start + pxPerMs × elapsed`, so slow frames make each step larger rather than the fling slower. It added a fixed 200px per frame until #872, which at 130ms frames was about 1.5 px/ms: only 1–3 of 23 events reached #301's 8 px/ms, so the mode rarely entered the path it was added for. `fastEvents` counts the events over that threshold, and `velocitiesPerRun` in the JSON keeps every event's measured velocity, so a fling that did not fling shows in its own output.
- State sync types ten characters 120ms apart, so **1.2s of every wall time is deliberate pacing**. `perKeystrokeMs` is the wall over ten and is the figure to quote; `busyPerKeystrokeMs` takes the pacing off, so a story that costs nothing reads as costing nothing rather than as costing the delay.
- `syncs` is the sandbox's own STATE_SYNC count and is **the one load-independent column** — one per keystroke on a healthy story, whatever the machine. Every ms beside it moves with the runner. Compare counts across machines and times only within one.
- `typed` is whether the burst finished at all. A page that never gives the main thread back cannot acknowledge a key event either, so the burst times out rather than running slowly; the run then reports nulls with `typed: false` instead of raising. `found: false` is the other null case — the story never reached the book.
- `quiet` is whether the page stopped working after the burst, read from STATE_SYNC and long animation frames rather than from a timer. `false` is a result, not a flake: it is what a story caught in #959's loop looks like.
- Typing is **real key events through the sandbox frame**, not `el.value` and a synthetic `input`. That costs absolute time a synthetic harness does not pay, and it is the point — the walk runs on the main thread the next keystroke needs. It also means figures here run higher than any taken synthetically; see the note under the state reference table.
- **Figures from before #872 are not comparable with those after.** The long-task numbers under-read scrolling cost, and the old fling was slower, and slower still on a slower page. Compare only runs taken with the same instrument.

## What the state bench cannot see, and why that is not a regression

The visit counts on #957 and #960 — 2,620,000 values per keystroke at 65,535 objects, 26,216,320 over a burst — are not in this bench and cannot be. They came from counters patched into four walkers: `toRawDeep` in `plugin-vue` and in `poveste-app`, and `diffState`, `applyState` and `recordState` in `poveste-shared`. Shipping those would put a counter in every published package for a one-off diagnostic, and the numbers are not comparable with anything else here. The patch is attached to #960 if an investigation wants them again.

Two things stand in for them, and both are load-independent, which no time on this page is. `syncs` is the sandbox's own STATE_SYNC count — one per keystroke on a healthy story, on any machine. And the object arithmetic in `state-graph.ts` falls out of the fixture's shape before anything runs: depth 15 is 65,535 objects carrying 32,767 `d` numbers and 32,768 `leaf` booleans, so 131,070 values a walk. That is the cheapest check there is on a new instrument — it matched the patched walkers' figure exactly.

The cost of the boundary, stated plainly: linear scaling shows less cleanly in time than in counts. The walkers' counts are exactly linear in objects; the clock here is not. Measured below, 511 → 8,191 objects is ×16 in objects and ×12 in time, and 8,191 → 65,535 is ×8 and ×15. **A count this bench does not print is a count it was never able to print.** It is not a number that went missing.

### The before-figures came from a different instrument

The figures on #957 and #960 were taken with a throwaway harness that set `el.value` and dispatched a synthetic `input` event, and that read blocked frames from a `setInterval(…, 8)` heartbeat. This bench types real key events and reads long animation frames. So **the counts and the ratios should agree and the times should not**, and a difference in the times is the meter, not the code. Measured side by side at 65,535 objects:

| | throwaway harness | this bench |
| --- | --- | --- |
| wall, 10 keystrokes | 17.5s (taken under load; not a baseline) | 21.2s |
| longest blocked frame | 1.8s | 1.57s |
| frames over 50ms | 10 | 20 |
| values visited per keystroke | 2,620,000 | not measurable here |

Real typing runs the key pipeline the synthetic path skips, which is why the wall is higher. The frame count is doubled for the same reason long tasks under-read scrolling (#872): a heartbeat samples, and rendering-step work falls between its samples.

## Reference, state sync (M3 Pro, built book, medians over 3 runs)

Ten real keystrokes 120ms apart, so 1.2s of every wall time is pacing rather than work. `busy` is per keystroke with that taken off. Every story reported 10 STATE_SYNC messages — one per keystroke — and went quiet afterwards.

Size, behind one writable `ref(null)` template ref:

| story | objects | wall | per keystroke | busy | frames over 50ms | longest |
| --- | --- | --- | --- | --- | --- | --- |
| `bench-state-0` | 1 | 1235 | 124 | 4 | 0 | — |
| `bench-state-512` | 511 | 1305 | 131 | 11 | 0 | — |
| `bench-state-8k` | 8,191 | 2563 | 256 | 136 | 20 | 137 |
| `bench-state-64k` | 65,535 | 21409 | 2141 | 2021 | 20 | 1386 |

Kind, all holding 65,535 objects:

| story | binding | wall | per keystroke | busy | longest |
| --- | --- | --- | --- | --- | --- |
| `bench-state-control` | none beyond the input | 1231 | 123 | 3 | — |
| `bench-state-plain` | `ref(tree)` | 23745 | 2375 | 2255 | 1703 |
| `bench-state-raw` | `ref(markRaw(tree))` | 17467 | 1747 | 1627 | 1189 |
| `bench-state-shallow` | `shallowRef(tree)` | 24316 | 2432 | 2312 | 1753 |
| `bench-state-ref` | writable template ref | 21565 | 2157 | 2037 | 1373 |
| `bench-state-usetemplateref` | `useTemplateRef` | 21789 | 2179 | 2059 | 1422 |

Four things to read out of those, in order of how easily each is misread.

**`bench-state-ref` and `bench-state-64k` are the same story in two tables.** 2037 against 2021 is the spread to expect between two measurements of one thing on this machine, and it is the cheapest calibration available — a gap much wider than that is the instrument, not the binding.

**`bench-state-usetemplateref` matching them is correct here and does not mean #959 is fixed.** Vue returns a readonly ref from `useTemplateRef` only in a dev build and compiles both the wrapper and its warning out of a built book, so against `poveste build` output the story is `bench-state-ref` under another name. Point it at a `poveste dev` server to see the defect it was placed for. Measured there:

```
run 1/1: the burst did not finish (locator.click: Timeout 60000ms exceeded.)
         — bench-state-usetemplateref never gave the main thread back
{"found":true,"typed":false,"quiet":false,"readonlyWarnings":100, ...}
```

A hundred warnings is Vue's recursive-update ceiling, and the page never comes back far enough to accept a click, let alone a keystroke. That is the whole of #959 in one line of output, and it is why the same story reads as ordinary above.

**`shallowRef` buys nothing**, which agrees with the patched-walker figures: it stops Vue tracking the graph deeply and does not stop our own walkers reading it.

**`markRaw` buys about a quarter, and both instruments now agree on that.** 2255 → 1627 here is 28%; #957 carried 70%, has withdrawn it, and re-measures at 18–25% across both modes, both fixture shapes and both instruments. The 70% came from two stories loaded minutes apart on a machine at load average 8–11 without interleaving — a path already recorded as swinging 5× under load alone. Nothing about the code differed between the two numbers.

The axis reads the same against a dev server as against a built book, which is worth knowing when a figure looks mode-dependent: `bench-state-ref` 2016 against 2021 built, `bench-state-raw` 1615 against 1627, `bench-state-plain` 2332 against 2255.

**What none of these numbers measure is the thing the fix turns on.** Every one of them is what `markRaw` buys *while the walkers ignore it*. #957 reports that honouring `__v_skip` takes the marked story from 1639 to 132ms a keystroke — control cost, and twenty long frames to none. A quarter is what the escape hatch is worth today, not what the direction is worth.

## Reference (M3 Pro, `conformance-huge-grid`, V=1000, 18 cells)

| | first | t10 | last | blocked |
| --- | --- | --- | --- | --- |
| before #239/#241 | 1923 | 2491 | 6968 | 1151 |
| after | 996 | 1390 | 2152 | 43 |
