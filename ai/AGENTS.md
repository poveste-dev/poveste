# Poveste — guide for AI contributors

This file is the source of truth for AI agents working in this repo. It lives at `ai/AGENTS.md`; the root `AGENTS.md` and [`CLAUDE.md`](../CLAUDE.md) point here, so Claude, Codex and Cursor read one copy that cannot drift between them.

Keep it short. Step-by-step procedures live in `ai/skills/`, invocable as `/add-conformance-story`, `/open-pr`, `/file-an-issue` and `/cut-a-release`.

This is not the contributor guide. [`CONTRIBUTING.md`](../CONTRIBUTING.md) covers setup, the package table, the test commands and the whole release procedure, and it is accurate — read it first. What follows is only what that file does not say and the repo does not reveal: the conventions that are real, unwritten, and have already caused wrong turns.

## Golden rules

**Be surgical.** Change what the task names and nothing else. `pnpm lint:fix` reformats whatever it touches, including files you did not open — check `git status` before committing and revert unrelated churn.

**Verify against output, not intention.** Several traps here are things that look right in the source and are wrong when served or published. If a change affects what ships, build it and look at the artifact.

**Do not assume the working tree is yours.** Use `git worktree add` for a branch rather than switching the shared checkout, which may have a dev server or a build running against it.

## Branches

Work targets **`next`**, not `main`. `next` is the integration branch; it reaches `main` at release time as a fast-forward, which is why it is rebased rather than merged.

Branching off `main` for anything multi-step is wrong before it starts.

Stacked PRs are normal for a queue of related work: base each branch on the previous one and say so in the body, since the GitHub diff otherwise shows the whole stack.

## The conformance contract

A story that proves a behaviour goes in **all four** reference books — `vue3`, `nuxt4`, `svelte5`, `sveltekit` — under each one's `conformance/` directory, with the spec in `e2e/` and the id and title in [`e2e/stories.ts`](../e2e/stories.ts).

`story-list.spec.ts` holds every book to that list. A story added to `examples/vue3` alone fails in three other projects, and the failure names a missing id rather than the thing you did.

The ids are explicit rather than derived from paths, because each framework lays its files out differently and a path-derived id cannot be addressed by one shared spec.

**The contract is not only stories.** A conformance book also declares the background presets the shared specs assert — the five `getDefaultConfig()` defaults plus the `Custom gray` sixth, and `defaultBackgroundColor: 'transparent'`. Spread `getDefaultConfig().backgroundPresets` or list the six literally; `examples/quasar` does the latter because its published recipe already owns the import line. A book that carries all 17 stories and skips this fails 18 specs on a preset count, which is how promoting Quasar spent a session (#540). `scripts/check-conformance-config.ts` fails on it in seconds instead, and covers a new book automatically — it reads the `:conformance` projects in `playwright.config.ts`, the same source of truth as the wiring check.

## What the examples are for

Eleven directories, two kinds, not interchangeable:

| | |
| --- | --- |
| **Reference books** | `vue3`, `nuxt4`, `svelte5`, `sveltekit` — the conformance set *and* the full shared story list |
| **Conformance books** | `quasar` — the conformance set only |
| **Fixtures** | `vike`, `vue3-tailwind`, `vue3-percy`, `vue3-screenshot`, `vue3-themed`, `vue3-vuetify` — each exists for one narrow thing |

`vue3-tailwind` is a fixture but a required status check: it tests a consumer's own Tailwind build against the chrome. Giving a fixture the conformance set only slows it down.

The middle row is the distinction to keep: a book can carry the conformance contract without being a mirror of the reference book. `SHARED_STORIES` is 17 ids and is the contract; `SHARED_STORY_TITLES` is 54 names and is this book's demo content. Requiring both of every new framework would price onboarding at 54 stories rather than 17.

`scripts/check-example-wiring.ts` keeps the workflow matrix, the Playwright config, each example's ports and the table above in agreement, so a new example that nobody explains here fails CI. Four of the fixtures run in no e2e job at all (#337), which is why that table rather than the matrix is what has to name them.

## Commands that do less than their name

| Command | What it actually covers |
| --- | --- |
| `pnpm test` | unit tests under `packages/**` only — not `scripts/` (`test:scripts`) and not the examples |
| `pnpm test:examples` | `examples/vue**` only; `test:examples:all` is the whole set |
| `pnpm test:smoke` | a publish gate, deliberately **not** in `pnpm test` — it needs a completed build, and it is what catches "works in the workspace, broken for consumers" |
| `pnpm test:e2e` | per-example, selected by `POVESTE_E2E_EXAMPLE=vue3,svelte5`; an unknown name fails the config before any test runs |
| `pnpm test:bundle-size` | ceilings on one built book, plus a source check for the `shiki` barrel — needs `examples/vue3` built, so it reports "no built book" rather than a size when run cold |

The e2e suite serves built books. A preview server left running from an earlier run will be reused and will serve **stale output**, so a fix appears not to work, or a broken build appears to pass. Kill stray servers before trusting a local e2e result.

Node comes from [`.node-version`](../.node-version); `fnm exec --using <version> pnpm ...` if your shell default is older.

## Issues

An issue gets a native GitHub issue **type** (`Bug`, `Feature`, `Task`) and at least one **`a:` label**: `a:vue`, `a:svelte`, `a:nuxt`, `a:app`, `a:node`, `a:controls`, `a:plugins`, `a:ci`, `a:repo`.

Milestones and `sprint:*` labels are the owner's — do not set them. `blocked` and the native dependency links express ordering instead.

`on:next` marks an issue whose fix has merged to `next` but has not shipped. Close it then, with a PR reference, rather than waiting for the release — but confirm the fix actually landed first; an issue mentioned in a diff is often incidental.

## Commits and PRs

The [commit convention](../.github/commit-convention.md) is enforced on PR titles by a required check.

**Never start a commit subject with a bare `@word`.** Release bodies are generated from subjects, so `@layer` or `@scope` becomes a real @-mention of whatever stranger holds that GitHub handle.

**No AI attribution.** No `Co-Authored-By` trailers, no generated-with footers.

**No closing keyword you do not mean.** GitHub matches `close`/`fix`/`resolve` before an issue number and ignores the words around them, so "this does not close #75" closes #75 — which is how that issue got closed. Write `see #75` instead.

## Prose style

**Comments earn their place.** A line for what is not derivable from the code — a browser quirk, why the obvious approach fails. Never a block narrating what the next five lines do. The reasoning belongs in the PR.

**Write markdown one line per paragraph** in anything you author: issues, PRs, review comments, new files. Hard wraps leave dead space in a split diff and reflow noisily when a sentence changes.

Much of `docs/` is still hard-wrapped, inherited from histoire. Leave it that way — reflowing a file you are otherwise not changing buries the real diff.

## Files that are not yours to edit

- `packages/poveste-app/src/app/util/icons.generated.ts` — generated; refresh with `pnpm --filter @poveste/app icons`
- `packages/poveste-vendors/dist/client/node_modules/` — scavenged at build time by `rollup.config.mjs` (#305)
- `CHANGELOG.md` — written by hand as release prep, and published verbatim as the GitHub release body. Nothing generates it and nothing can. See CONTRIBUTING.md.

## What is not settled

This repo is a fork of histoire, and inherited documentation drifts from it. Where this guide and an older file disagree, this guide is the one being maintained — but say so in the PR rather than assuming, because the older file is sometimes the correct one.

One thing that looks like drift and is not: `examples/nuxt4` still uses `histoire.config.ts`. The legacy filename is a supported feature with its own coverage in `config.spec.ts`, so renaming it as tidying removes the only example exercising it.

The skills in `ai/skills/` cover the four procedures that are settled and span more than one file. There is deliberately no skill for adding a framework plugin: #375 is still the analysis, and a checklist for a procedure nobody has completed would be invention rather than documentation.

## Notes for agents

Each skill's canonical file is `ai/skills/<name>/SKILL.md`. `.claude/skills`, `.codex/prompts/` and `.cursor/commands/` are symlinks into it — edit the canonical file, and every tool follows.

Windows checkouts need `core.symlinks=true` for those to resolve; macOS and Linux are fine.
