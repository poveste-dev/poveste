# Poveste — guide for AI contributors

This file is the source of truth for AI agents working in this repo. It lives at `ai/AGENTS.md`; the root `AGENTS.md` and [`CLAUDE.md`](../CLAUDE.md) point here, so Claude, Codex and Cursor read one copy that cannot drift between them.

Keep it short. Step-by-step procedures live in `ai/skills/`, invocable as `/add-conformance-story`, `/open-pr`, `/file-an-issue`, `/cut-a-release` and `/hand-over-work`.

This is not the contributor guide. [`CONTRIBUTING.md`](../CONTRIBUTING.md) covers setup, the package table, the test commands and the whole release procedure, and it is accurate — read it first. What follows is only what that file does not say and the repo does not reveal: the conventions that are real, unwritten, and have already caused wrong turns.

## Golden rules

**Be surgical.** Change what the task names and nothing else. `pnpm lint:fix` reformats whatever it touches, including files you did not open — check `git status` before committing and revert unrelated churn.

**Verify against output, not intention.** Several traps here are things that look right in the source and are wrong when served or published. If a change affects what ships, build it and look at the artifact.

**Do not assume the working tree is yours.** Use `git worktree add` for a branch rather than switching the shared checkout, which may have a dev server or a build running against it.

## One preview, whatever the layout

A layout choice must never be expressed as sibling template branches that both contain the preview. Flipping it then moves the preview in the component tree, Vue rebuilds it, and the sandbox realm underneath boots a cold document — no crash, no wrong pixel, no red test. It was found by hand four times (#328, #595, #596, #600) before `scripts/checks/preview-position.ts` started failing on it.

The shape alone does not decide it. `StoryViewer` and `StoryVariantSingleView` both put the preview in more than one branch and are fine, because their conditions are properties of the story being shown and a story change rebuilds anyway. The condition is what matters: a live layout flag is the bug, a per-story property is not. The check knows the second kind from a skip-list, so a condition nobody has classified fails rather than being assumed harmless — add to `STABLE` with a reason, or hoist the preview above the branches.

## A step's position stops meaning anything

Once a step in a job carries a status-function `if:` — `success()`, `failure()`, `always()`, `cancelled()` — or `continue-on-error: true`, no step below it inherits what its position suggests. A status function suppresses the implicit `success()` in full, including the dependency on the step immediately above; `continue-on-error` makes a step's conclusion success whatever its outcome. So "put it after X" specifies nothing below the first such step, and both `test.yml` and `release.yml` are past that line for most of their length.

Specifying one label sweep cost four attempts on this, each correct-looking in review, before landing on the step whose outcome the work actually depended on (#722, #723). Say what a step depends on — `if: ${{ steps.<id>.outcome == 'success' }}` — rather than placing it somewhere that looks safe.

`scripts/checks/step-gates.ts` holds it. It classifies **boundaries** rather than steps: the first masked step in a job, and each point below it where the job switches between stating its dependency and inheriting `success()`. Two records, not one, because the deliberate cases are opposites — `RUNS_PAST_FAILURE` for a step that names a status function so it runs *after* something failed, `NEEDS_EVERYTHING_ABOVE` for one that names nothing because the implicit `success()` is exactly what it wants. A single "classified, with a reason" list would file both under the same heading and hand the next person two entries arguing opposite ways.

## Branches

Work targets **`next`**, not `main`. `next` is the integration branch; it reaches `main` at release time as a fast-forward, which is why it is rebased rather than merged.

A fast-forward has no selection step, so a release contains whatever is sitting on `next` when the tag is cut — not what the notes describe. Within a day of a release, work is **green and parked**: branch, build, open the PR, get it green, and *do not merge*. Say "parked until v<version> is out" in the body, because a green check is otherwise read as an invitation. `on:next` and the closing convention are unaffected — this is only about the merge.

The asymmetry is why it is a rule rather than a judgement: holding a commit for a day costs a day, while a commit that lands unnoticed ships inside a release whose notes were written against a different set, and publishing is what emails every watcher (#399). That email cannot be re-sent.

Branching off `main` for anything multi-step is wrong before it starts.

Stacked PRs are normal for a queue of related work: base each branch on the previous one and say so in the body, since the GitHub diff otherwise shows the whole stack.

A stack merges as **one ref update** — `gh stack link --base next <prs, bottom to top>` then `gh stack merge <stack>` — never PR by PR. `delete_branch_on_merge` is on deliberately, so merged branches do not accumulate on the remote; the cost lands only on a sequential merge, which deletes the base of the PR above it, retargets that PR to `next`, and leaves the squash conflicting. `--base next` is required because `link` defaults to the repository default, which is `main`; the stack number is required because the shared checkout sits on `main`, which is in no stack. Recovering a stack already broken this way is in `/open-pr`.

## The conformance contract

A story that proves a behaviour goes in **all four** reference books — `vue`, `nuxt`, `svelte`, `sveltekit` — under each one's `conformance/` directory, with the spec in `e2e/` and the id and title in [`e2e/stories.ts`](../e2e/stories.ts).

`story-list.spec.ts` holds every book to that list. A story added to `examples/vue` alone fails in three other projects, and the failure names a missing id rather than the thing you did.

The ids are explicit rather than derived from paths, because each framework lays its files out differently and a path-derived id cannot be addressed by one shared spec.

**The contract is not only stories.** A conformance book also declares the background presets the shared specs assert — the five `getDefaultConfig()` defaults plus the `Custom gray` sixth, and `defaultBackgroundColor: 'transparent'`. Spread `getDefaultConfig().backgroundPresets` or list the six literally; `examples/quasar` does the latter because its published recipe already owns the import line. A book that carries all 17 stories and skips this fails 18 specs on a preset count, which is how promoting Quasar spent a session (#540). `scripts/checks/conformance-config.ts` fails on it in seconds instead, and covers a new book automatically — it reads the `:conformance` projects in `playwright.config.ts`, the same source of truth as the wiring check.

## What the examples are for

Eleven directories, three kinds, not interchangeable:

| | |
| --- | --- |
| **Reference books** | `vue`, `nuxt`, `svelte`, `sveltekit` — the conformance set *and* the full shared story list |
| **Conformance books** | `quasar` — the conformance set only |
| **Fixtures** | `vike`, `vue-tailwind`, `vue-percy`, `vue-screenshot`, `vue-themed`, `vue-vuetify` — each exists for one narrow thing |

`vue-tailwind` is a fixture but a required status check: it tests a consumer's own Tailwind build against the chrome. Giving a fixture the conformance set only slows it down.

The middle row is the distinction to keep: a book can carry the conformance contract without being a mirror of the reference book. `SHARED_STORIES` is 17 ids and is the contract; `SHARED_STORY_TITLES` is 54 names and is this book's demo content. Requiring both of every new framework would price onboarding at 54 stories rather than 17.

`scripts/checks/example-wiring.ts` keeps the workflow matrix, the Playwright config, each example's ports and the table above in agreement, so a new example that nobody explains here fails CI. Four of the fixtures run in no e2e job at all (#337), which is why that table rather than the matrix is what has to name them — the `Unbuilt books` job builds three of them so that a fixture which stops building says so, but it runs no specs, because they have none. `vue-screenshot` is the fourth and is not built: it needs a Chrome CI does not provide (#654). That job also builds `@poveste/controls-stories`, which is not an example at all — it is the book over the builtin controls, and the only exercise the seven of them have (#672).

**Renaming an example is a two-part change.** The e2e job name is built from the matrix entry, so `examples/vue3` becoming `examples/vue` renamed the required check `Example e2e (vue3)` on `main` — and a required check that is never reported is never satisfied, so the next release push to `main` is refused. `next` is unprotected, so nothing before that push says a word. `.github/required-status-checks.txt` records what `main` requires and the wiring check holds it to the matrix; GitHub holds the real list and reading it needs admin, so the settings page and that file are edited together, by hand (#795).

## How the chrome is styled

Plain CSS over the `@theme` custom properties, in the component's own `<style>` block. Not Tailwind utilities in `class`, and not a variant map in script.

Two controls disagreed about this while ten more were about to be written against whichever was copied (#978). The rules, each with the reason it exists, are in [`packages/poveste-controls/CONVENTIONS.md`](../packages/poveste-controls/CONVENTIONS.md), and `scripts/checks/control-conventions.ts` fails CI on the two a script can hold.

Two of them are worth knowing before you open a control, because both fail quietly rather than loudly:

**Dark mode goes on the subject.** `.ptw-dark` sits on `<html>`, above the `@scope` root the chrome is wrapped in, so a descendant rule keyed on it never matches from inside a control (#101). Write `&:where(.ptw-dark, .ptw-dark *)`. The `dark:` *utility* is safe and compiles to exactly that; `@apply` with a `dark:` variant is what breaks, and it breaks by keeping the light colours with nothing reported.

**`data-slot` is the consumer's only seam.** `@scope` removes a consumer's CSS from our markup, so a stable attribute is all they have left to target. It cannot be retrofitted once a component has shipped without it, which is why the check refuses a control that names no part.

## Commands that do less than their name

| Command | What it actually covers |
| --- | --- |
| `pnpm test` | unit tests under `packages/**` only — not `scripts/` (`test:scripts`) and not the examples |
| `pnpm test:smoke` | a publish gate, deliberately **not** in `pnpm test` — it needs a completed build, and it is what catches "works in the workspace, broken for consumers" |
| `pnpm test:e2e` | per-example, selected by `POVESTE_E2E_EXAMPLE=vue,svelte`; an unknown name fails the config before any test runs. One root config defines every project and `webServer` is top-level, so `--project` on its own still boots every book's server — the variable is what narrows it (#386) |
| `pnpm test:bundle-size` | ceilings on one built book, plus a source check for the `shiki` barrel — needs `examples/vue` built, so it reports "no built book" rather than a size when run cold |

The e2e suite serves built books. A preview server left running from an earlier run will be reused and will serve **stale output**, so a fix appears not to work, or a broken build appears to pass. Kill stray servers before trusting a local e2e result.

Node comes from [`.node-version`](../.node-version); `fnm exec --using <version> pnpm ...` if your shell default is older.

## Issues

An issue gets a native GitHub issue **type** (`Bug`, `Feature`, `Task`) and at least one **`a:` label**: `a:vue`, `a:svelte`, `a:nuxt`, `a:app`, `a:node`, `a:controls`, `a:plugins`, `a:ci`, `a:repo`.

Seven of those say what they are. Two do not, and picking them wrongly is defensible enough that it has already happened:

**`a:repo` is the repository as a published artifact** — governance files, the docs site, CI configuration, `scripts/`, what the README claims. It is *not* "any file outside `packages/`", which describes a large and unrelated set and answers no question anyone asks the label.

**A framework label covers that framework's example books**, not only its plugin package. An example's source takes the label of the framework it teaches, because someone filtering `a:svelte` wants the Svelte surface entire. #610 is a defect in the SvelteKit example's own source and carries `a:svelte`, though it changes no plugin package; #146 is the same directory family and carries it too.

`a:ci` is the workflows and the test harness, which is the one real overlap and is fine: an example's **wiring** is `a:ci`, an example's **source** is its framework. That is why #386 and #278 carry it while sitting under `examples/`.

Milestones and `sprint:*` labels are the owner's — do not set them. `blocked` and the native dependency links express ordering instead.

`on:next` marks an issue whose fix has merged to `next` but has not shipped. Close it then, with a PR reference, rather than waiting for the release — but confirm the fix actually landed first; an issue mentioned in a diff is often incidental.

`release.yml` clears the label from everything carrying it once the packages are verified on npm, so it means what it says rather than accumulating. Nothing removed it until #722 and it had reached 104 issues, 100 of them already shipped — read as documented it was wrong 96% of the time.

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
- `CHANGELOG.md` — written by hand as release prep, and published verbatim as the GitHub release body. Nothing generates it and nothing can. See CONTRIBUTING.md.

## What is not settled

This repo is a fork of histoire, and inherited documentation drifts from it. Where this guide and an older file disagree, this guide is the one being maintained — but say so in the PR rather than assuming, because the older file is sometimes the correct one.

One thing that looks like drift and is not: `examples/nuxt` still uses `histoire.config.ts`. The legacy filename is a supported feature with its own coverage in `config.spec.ts`, so renaming it as tidying removes the only example exercising it.

The skills in `ai/skills/` cover the five procedures that are settled and span more than one file. There is deliberately no skill for adding a framework plugin: #375 is still the analysis, and a checklist for a procedure nobody has completed would be invention rather than documentation.

## Notes for agents

Each skill's canonical file is `ai/skills/<name>/SKILL.md`. `.claude/skills`, `.codex/prompts/` and `.cursor/commands/` are symlinks into it — edit the canonical file, and every tool follows.

Windows checkouts need `core.symlinks=true` for those to resolve; macOS and Linux are fine.
