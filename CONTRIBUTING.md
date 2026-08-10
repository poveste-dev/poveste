# Poveste Contributing Guide

Welcome! We are really excited that you are interested in contributing to Poveste. Before submitting your contribution, please make sure to take a moment and read through the following guide:

## Means of Contributing

Contributing doesn't necessarily mean you need to write code and open Pull Requests. There are many other ways you can help the project!

- Try the [latest version](https://github.com/poveste-dev/poveste/releases) of Poveste and [report bugs](https://github.com/poveste-dev/poveste/issues/new?assignees=&labels=to+triage&template=bug-report.yml).
- Discuss your ideas with the community on the [discussion board](https://github.com/poveste-dev/poveste/discussions).
- Answer to other people's questions.
- Report typos or issues of the docs.
- Do you like Poveste? Spread the love on social media!

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
| [@poveste/plugin-svelte](./packages/poveste-plugin-svelte) | Svelte 4/5 and SvelteKit integration |
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

## Releasing

Releases are cut from `main` with [bumpp](https://github.com/antfu-collective/bumpp), which bumps every workspace `package.json` in lockstep, commits, tags `v<version>` and pushes. The pushed tag triggers `.github/workflows/release.yml`, which builds, runs the smoke test and publishes to npm.

```sh
# Root of the mono-repo
pnpm run release patch   # or: minor, major
```

The version type is a positional argument — pnpm appends it to the end of the script, where it becomes the value of bumpp's trailing `--release` flag. Don't write `pnpm run release -- --release patch`: bumpp treats everything after `--` as file arguments, so the type is read as a filename and it drops to an interactive prompt.

`release` runs `release:check` first, which gates the release on lint, build, unit tests and the smoke test:

```sh
# Root of the mono-repo — the same gate, without bumping anything
pnpm run release:check
```

The smoke test (`pnpm run test:smoke`) packs the publishable tarballs, installs them into a throwaway project with npm (no workspace symlinks) and runs a real `poveste build`. It is deliberately not part of `pnpm run test`, because it needs a completed build — but it is the check that catches "works in the pnpm workspace, broken for consumers" bugs, so the release must not skip it.

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
