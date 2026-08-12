# Poveste Contributing Guide

Welcome! We are really excited that you are interested in contributing to Poveste. Before submitting your contribution, please make sure to take a moment and read through the following guide:

## Means of Contributing

Contributing doesn't necessarily mean you need to write code and open Pull Requests. There are many other ways you can help the project!

- Try the [latest version](https://github.com/poveste-dev/poveste/releases) of Poveste and [report bugs](https://github.com/poveste-dev/poveste/issues/new?assignees=&labels=to+triage&template=bug-report.yml).
- Discuss your ideas with the community on the [discussion board](https://github.com/poveste-dev/poveste/discussions).
- Answer to other people's questions.
- Report typos or issues of the docs.
- Do you like Poveste? Spread the love on social media!

## Issue triage

Before an issue gets a milestone, it needs a native GitHub issue type (`Bug`, `Feature`, or
`Task`) plus at least one `a:` area label. That pairing is what keeps the board queryable.
`perf`, `docs`, `chore` and `spike` still exist as refinements for cases where `Bug` and `Task`
are too coarse.

## Packages

This mono-repo contains the following packages:

| Package | Description |
| ------- | ----------- |
| [poveste](./packages/poveste) | Main package |
| [@poveste/app](./packages/poveste-app) | Pre-bundled UI |
| [@poveste/controls](./packages/poveste-controls) | Builtin controls components |
| [@poveste/controls-stories](./packages/poveste-controls-stories) | Stories for builtin controls |
| [@poveste/plugin-vue](./packages/poveste-plugin-vue) | Vue 3 integration |
| [@poveste/plugin-nuxt](./packages/poveste-plugin-nuxt) | Nuxt 4 integration |
| [@poveste/plugin-svelte](./packages/poveste-plugin-svelte) | Svelte 5 and SvelteKit integration |
| [@poveste/plugin-percy](./packages/poveste-plugin-percy) | Visual regression testing with Percy |
| [@poveste/plugin-screenshot](./packages/poveste-plugin-screenshot) | Visual regression testing with simple screenshots |
| [@poveste/shared](./packages/poveste-shared) | Shared utilities |
| [@poveste/vendors](./packages/poveste-vendors) | Pre-bundled dependencies |

## Local dev setup

1. Install dependencies with [pnpm](https://pnpm.io/):

```sh
node corepack enable
pnpm i
```

2. Compile Poveste in watch mode:

```sh
pnpm run watch
```

Wait before the initial build is done and the terminal output stabilizes.

If you do not intend to make changes to the poveste main packages, you can use this script instead:

```sh
pnpm run build
```

3. In the `examples` directory, you can run `story:dev` scripts to start Poveste on an example project.

```sh
cd examples/vue3
pnpm run story:dev
```

> For the `vue3` example, you can use the `pnpm run dev:pvt` command to start the app with a special configuration enabling HMR for the Poveste UI. Especially useful when working on the UI!

4. After you have tested your changes in development mode, build the story apps and test them using the `story:build` and `story:preview` scripts:

```sh
pnpm run story:build
pnpm run story:preview
```

## Running tests

### Linting

We use ESLint to check for code quality and style.

```sh
# Root of the mono-repo
pnpm run lint
```

### Unit tests

We use [Vitest](https://vitest.dev/) to run unit tests on workspaces listed under the `packages` folder.

For developping:

```sh
# Root of the mono-repo
pnpm run test:dev
```

(You can also run this in specific package folders.)

For running all tests in the terminal:

```sh
# Root of the mono-repo
pnpm run test
```

### Example projects tests

Examples projects found in the `examples` can also have tests. To run them all:

```sh
# Root of the mono-repo
pnpm run test:examples
```

In an example project, you can run the following script if there are tests:

```sh
cd examples/vue3

pnpm run test:examples
```

To develop new tests in an example project, you can use:

```sh
cd examples/vue3

pnpm run story:dev
# In another terminal
pnpm run test:dev
```

### StackBlitz starters

The three "Try it live" starters in `docs/.vitepress/theme/starters.ts` install with npm from the public registry, so nothing in the suites above covers them — this workspace's `peerDependencyRules` let an example install where npm would fail with `ERESOLVE`. To resolve them for real:

```sh
# Root of the mono-repo — needs network
pnpm run test:starters
```

It runs nightly rather than on every PR, because the usual way it breaks is the registry moving underneath a file nobody touched. Edit the versions in `starters.ts` only; the check reads the same manifests the launcher ships.

## Releasing

Releases are cut from `main` with [bumpp](https://github.com/antfu-collective/bumpp), which bumps every workspace `package.json` in lockstep, commits, tags `v<version>` and pushes. The pushed tag triggers `.github/workflows/release.yml`, which builds, runs the smoke test and publishes to npm.

```sh
# Root of the mono-repo
pnpm run release patch   # or: minor, major
```

The version type is a positional argument — pnpm appends it to the end of the script, where it becomes the value of bumpp's trailing `--release` flag. Don't write `pnpm run release -- --release patch`: bumpp treats everything after `--` as file arguments, so the type is read as a filename and it drops to an interactive prompt.

Pick the type from the commits being released, not from the milestone: **a `feat` in the range means `minor`, otherwise `patch`**. Check with `git log v<previous>..HEAD --format='%s'` before running it. A milestone names the release its issues are aimed at, not a guarantee of what ships in it — issues can slip to a later version, so the milestone and the actual release can disagree.

`major` is never reached this way. It is a deliberate stability declaration with its own checklist — see [What 1.0 means](https://poveste.dev/guide/getting-started.html#what-1-0-means).

`release` runs `release:check` first, which gates the release on lint, build, unit tests and the smoke test:

```sh
# Root of the mono-repo — the same gate, without bumping anything
pnpm run release:check
```

The smoke test (`pnpm run test:smoke`) packs the publishable tarballs, installs them into a throwaway project with npm (no workspace symlinks) and runs a real `poveste build`. It is deliberately not part of `pnpm run test`, because it needs a completed build — but it is the check that catches "works in the pnpm workspace, broken for consumers" bugs, so the release must not skip it.

Cut the release on the Node version in [`.node-version`](./.node-version). The gate only means something if it runs on the Node that publishes.

### CHANGELOG.md

Nothing writes `CHANGELOG.md` automatically. `changelogithub` generates the **GitHub release** from the commit log at tag time; it does not touch the file, which is why the file silently kept describing histoire through poveste's first six releases.

So add the new section by hand as part of release prep, before `pnpm run release`:

1. Draft the entries from `git log v<previous>..HEAD --format='%s'`, grouping them as `🚨 Breaking Changes` / `🚀 Enhancements` / `🩹 Fixes` / `🏡 Chore` and skipping anything invisible to a consumer.
2. Add a `[compare changes]` link against the previous tag.
3. Reference PRs as `#N` where there is one, and a short commit SHA otherwise.

Then cross-check the published GitHub release once CI has run: if the two disagree, the release is the source of truth and the file is wrong.

### The GitHub release body

`changelogithub` runs unconfigured, so the release body is built from **commit subjects alone**. That is fine for a release that is a list of changes, and not fine for a release that is a story — a deprecation, a migration, a changed default, a floor that moved.

Since the GitHub release is the canonical artifact, it is the one that has to explain the release. So after `pnpm run release`, read the published body and ask whether someone who only reads that would know what to do. If not, edit it:

```sh
gh release edit v<version> --notes-file <file>
```

Keep the generated section at the bottom and put the explanation above it — the commit list is still the accurate record of *what* landed, it just does not carry *why it matters* or *what to change*.

`v0.4.0` is the worked example. changelogithub produced a single line — "Accept setupVue alongside setupVue3" — which is a correct summary of the commit and a useless summary of the release: nothing told a reader that their existing code still works, that their editor would start flagging `defineSetupVue3`, or that 1.0 is the deadline for the old spelling.

A rule of thumb for when the generated body is not enough:

- something is deprecated, renamed, or removed
- a supported version floor moved
- a default changed
- the upgrade needs any action, **or notably needs none** — "nothing to do" is worth saying out loud, because a deprecation notice in an editor makes people assume otherwise

## Pull Request Guidelines

- Checkout a topic branch from a base branch, e.g. `main`, and merge back against that branch.

- If adding a new feature:

  - Add accompanying test case.
  - Provide a convincing reason to add this feature. Ideally, you should open a suggestion issue first and have it approved before working on it.

- If fixing bug:

  - If you are resolving a special issue, add `(fix #xxxx[,#xxxx])` (#xxxx is the issue id) in your PR title for a better release log, e.g. `fix: update entities encoding/decoding (fix #3899)`.
  - Provide a detailed description of the bug in the PR. Live demo preferred.
  - Add appropriate test coverage if applicable.

- It's OK to have multiple small commits as you work on the PR - GitHub can automatically squash them before merging.

- Make sure to follow the code style of the project.

- Make sure tests pass!

- Commit messages must follow the [commit message convention](./.github/commit-convention.md) so that changelogs can be automatically generated.<!-- Commit messages are automatically validated before commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [yorkie](https://github.com/yyx990803/yorkie)). -->

<!--
- No need to worry about code style as long as you have installed the dev dependencies - modified files are automatically formatted with ESLint on commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [yorkie](https://github.com/yyx990803/yorkie)).
-->
