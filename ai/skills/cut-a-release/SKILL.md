---
name: cut-a-release
description: >-
  Cut a poveste release — hand-write the CHANGELOG section BEFORE tagging, because it is published
  as the GitHub release body and publishing is what emails every watcher, and that email cannot be
  fixed afterwards. Use when asked to cut, prepare or publish a release, bump the version, write
  release notes, or diagnose a release workflow failure.
---

# Cutting a poveste release

`CONTRIBUTING.md` has the full procedure and is accurate — read it. This is the order of operations and the parts that bite.

## The one irreversible step

**Publishing the GitHub release is what emails everyone watching the repository, and editing a published release never re-sends that notification.** The body is the `CHANGELOG.md` section for the tag, so that section has to be right *before* the tag is cut. Through v0.8.1 the body was a generated commit list rewritten by hand afterwards, so subscribers were emailed the commit list every time and the notes written for them reached nobody (#399).

Everything else in a release can be re-run. This cannot.

## Order

1. **Merge `next` into `main`** — a fast-forward. That is why `next` is kept rebased.
2. **Write the `CHANGELOG.md` section by hand.** Nothing generates it and nothing can. Draft from `git log v<previous>..HEAD --format='%s'`, group as changelogithub does (🚨 Breaking Changes / 🚀 Enhancements / 🩹 Fixes / 📖 Documentation / ✅ Tests / 🤖 CI / 🏡 Chore), skip anything a consumer cannot see, and add the `[compare changes]` link.
3. **Check what will actually be published:** `node scripts/check-changelog.ts v<version>`.
4. **Pick the type from the commits, not the milestone** — a `feat` in the range means `minor`, otherwise `patch`. A milestone names the release its issues aim at, not what shipped; issues slip.
5. `pnpm run release patch` (or `minor`).

## The invocation

The type is a **positional** argument — pnpm appends it where it becomes the value of bumpp's trailing `--release`:

```bash
pnpm run release patch
```

Do **not** write `pnpm run release -- --release patch`. bumpp treats everything after `--` as file arguments, reads the type as a filename, and drops to an interactive prompt.

Cut the release on the Node version in `.node-version`. The gate only means something on the Node that publishes.

## What the gate does and does not cover

`release` runs `release:check` first: lint, versions, readmes, example wiring, recipes, build, publishable, script tests, unit tests and the smoke test.

**`pnpm run test:smoke` is deliberately not part of `pnpm test`** — it needs a completed build. It packs the real tarballs, installs them with npm into a throwaway project and runs a real `poveste build`, which is what catches "works in the pnpm workspace, broken for consumers". Never skip it.

The browser suites are deliberately *not* in the release gate (#75) — they already ran on the PRs that produced the commits.

## When notes have to do the work

A commit list alone leaves a reader stuck whenever something is deprecated, renamed or removed; a supported version floor moved; a default changed; or the upgrade needs action — **or notably needs none**. "Nothing to do" is worth saying out loud, because a deprecation warning in an editor makes people assume otherwise.

`v0.4.0` is the worked example: changelogithub produced one correct, useless line that told nobody their existing code still worked.

## If the workflow fails

`release.yml` waits for `test.yml` to be green on the tagged commit before building. bumpp pushes the bump straight to `main`, bypassing branch protection, so it is the one published commit no required check ever cleared — that wait is the substitute. If it is red, re-run `test.yml`; once green, re-run the release job. Nothing is published in the meantime.

The release is created as a **draft** and published only after the packages are verified on npm, because publishing is what sends the email. If the run fails before that, the draft stays unpublished and the last step says so.

`major` is never reached this way — it is a deliberate stability declaration with its own checklist.
