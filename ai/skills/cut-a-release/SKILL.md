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

1. **Rebase `next` onto `main` if they have diverged, then fast-forward `main` to it.** After every release `main` is exactly one commit ahead — bumpp's version bump goes there and nowhere else — so the *second* release in a cycle always needs the rebase first. `git merge --ff-only` fails with *"Not possible to fast-forward"* when you skip it. The rebase rewrites `next`, so pushing it needs `--force-with-lease`; `next` is unprotected, `main` is not.
2. **Write the `CHANGELOG.md` section by hand.** Nothing generates it and nothing can. Draft from `git log v<previous>..HEAD --format='%s'`, group as changelogithub does (🚨 Breaking Changes / 🚀 Enhancements / 🩹 Fixes / 📖 Documentation / ✅ Tests / 🤖 CI / 🏡 Chore), skip anything a consumer cannot see, and add the `[compare changes]` link.
3. **Check what will actually be published:** `node scripts/checks/changelog.ts v<version>`.
4. **Pick the type from the commits, not the milestone** — a `!` marker or a `BREAKING CHANGE:` footer in the range means `minor`, so does a `feat`, and otherwise it is a `patch`. A breaking change lands in the minor because the package is pre-1.0 and `major` is a separate declaration (below); a `patch` that breaks consumers is the one direction a caret range cannot defend against. A milestone names the release its issues aim at, not what shipped; issues slip.
5. `pnpm run release patch` (or `minor`).

## The freeze

**Declare it before step 1 and lift it deliberately.** `next` is frozen from the moment you start writing the notes: the release is a fast-forward, so anything merged while you write ships inside a section that never described it. Contributors are told to park work as green-and-open in `ai/AGENTS.md`; the person cutting is the one who has to say when that starts and when it ends.

**It lifts on two conditions, not one.**

1. **The release is verified on npm** — not when the tag is pushed. `release.yml` waits on `test.yml` green for the tagged commit, and a red run gets re-run; until the packages are on the registry the release can still need attention, and `next` wants to be unchanged while it does.
2. **`next` has been rebased onto `main`.** This is the one that gets forgotten, because by then the interesting part is over. `scripts/release/release.ts` commits the bump to `main` alone, so `next` is one commit behind the moment a release lands — and merging into an un-rebased `next` is exactly how the *next* cut arrives at `git merge --ff-only` refusing. Rebase before you cut, rebase before you resume; they are the same rule from both ends.

**The check, immediately before tagging.** `node scripts/checks/changelog.ts v<version>` warns on stderr when commits landed after the section was last written, and names them:

```
::warning::3 commits landed after the CHANGELOG.md section was last written
  • fix(app): …
```

Read each one. If it belongs in the notes, add it; if it is deliberately unmentioned — a chore no consumer can see — touching `CHANGELOG.md` records that judgement and clears the warning. It is a warning rather than a failure because that judgement is the writer's, and it is on stderr because the workflow redirects this script's stdout into the published release body.

**It needs no install.** The script imports only node builtins plus `publishable.ts` and `support/captured.ts`, so `git worktree add --detach <ref>` and run it there — seconds, and it never touches the shared checkout, which sits on `main` and does not have the section.

**Run it again after the rebase.** A rebase rewrites the commits it compares against, so a silent result before the rebase says nothing about the tree you are about to tag. Same command, second run, on the rebased tree.

## `next` is behind by one commit the moment a release lands

This is the step that is easy to miss, because it is invisible until the second release in a cycle.

`scripts/release/release.ts` bumps 26 manifests, commits and tags **on `main`**. `next` never receives that commit, so it still says the previous version. One release and nobody notices; two, and `git merge --ff-only origin/next` refuses.

Rebasing replays the new work on top of the bump, which is why the branch model rebases `next` rather than merging it — a merge would put the bump *behind* the new commits and the fast-forward would still be impossible.

**Write the CHANGELOG section on `next`, not on `main`.** Committing it straight to `main` diverges the branches again the moment it lands, and the next release pays for it.

**Anything reading the version from a manifest reads the old one on `next`.** `docs/.vitepress/config.js` takes `softwareVersion` from `packages/poveste/package.json` for its JSON-LD, and on `next` before a rebase that is the *previous* release — correct-looking in review, wrong in the artifact. Build after the rebase, or check the number against the tag rather than the branch.

## The invocation

The type is a **positional** argument, read by `scripts/release/release.ts` and validated before anything runs:

```bash
pnpm run release patch
```

A type it does not recognise fails immediately by name. It used to reach bumpp by landing at the very end of a script string as the value of a trailing `--release`, which held only while nothing was ever appended after it and failed as an interactive prompt when something was (#457).

**The type is checked against the range, not only against the list of types.** A patch-sized release is refused when a commit between the last tag and `HEAD` carries a `!` marker or a `BREAKING CHANGE:` footer, and the refusal names those commits (#1099). Until that existed the rule in step 4 lived only in this file, and step 4 said nothing about a breaking change at all — so the documented answer for a range that drops an LTS line was `patch`.

Two things about it are worth knowing before it surprises you. The detection is an **anchored footer** and not a search for the words, because the changelog commit of every patch release quotes `BREAKING CHANGE` in prose while justifying that release — a loose match reads those as breaking. And the range starts at the last tag **reachable from `HEAD`**, which is the previous release when you cut on `main` as step 1 leaves you; cut from a branch that is missing the last release commit and the range is wider, so the check can over-report and never miss.

That script is also what pushes. bumpp runs with `--no-push`, because its own push is `git push --tags` — every tag on the machine, not the one it just made, which is how cutting v0.10.0 also published a maintainer's private `salvage/…` tag. `release:check` runs `test:tags` first and lists local tags outside `v<version>`; it warns rather than fails, since a tag on unmerged work can be the only reference keeping that commit alive.

Cut the release on the Node version in `.node-version`. The gate only means something on the Node that publishes.

## What the gate does and does not cover

`release` runs `release:check` first: lint, versions, readmes, example wiring, recipes, build, publishable, script tests, unit tests and the smoke test.

**`pnpm run test:smoke` is deliberately not part of `pnpm test`** — it needs a completed build. It packs the real tarballs, installs them with npm into a throwaway project and runs a real `poveste build`, which is what catches "works in the pnpm workspace, broken for consumers". Never skip it.

The browser suites are deliberately *not* in the release gate (#75) — they already ran on the PRs that produced the commits.

## When notes have to do the work

A commit list alone leaves a reader stuck whenever something is deprecated, renamed or removed; a supported version floor moved; a default changed; or the upgrade needs action — **or notably needs none**. "Nothing to do" is worth saying out loud, because a deprecation warning in an editor makes people assume otherwise.

**Answer the floor question from a derived set, not from memory.** Three surfaces move a floor, and each is a diff over *every* `packages/*/package.json` that is not `private`:

```bash
# for each published manifest, v<previous> against the release branch
engines.node        # widens or narrows what a consumer may run
peerDependencies    # a grouped dependabot bump moves these with nothing in its title saying so
exports             # a removed subpath is a removal, whatever the package README calls itself
```

Enumerate the manifests in the command rather than naming them. 0.16.0 was answered twice from short lists — once from `engines.node` alone, once from eight packages when twelve were published — and both passes were correct about the files they read. The gap is which files get read, so it belongs in the command.

The result still goes through the consumer test: `@poveste/vendors` dropped three export subpaths in 0.16.0 and earned no line, because its README says there is nothing to install directly and no page in `docs/` names it.

`v0.4.0` is the worked example: changelogithub produced one correct, useless line that told nobody their existing code still worked.

## No count of the range you are writing

The notes commit lands in the range the tag covers, so **a count of that range taken while writing the notes is wrong by construction** — it is measured at two commits and published at three.

0.16.1 lost a commit count to this, and 0.16.2 then lost the sentence written to replace it. *"Both commits in the range are a `fix`, neither carries a `!` marker"* has no numeral in it and is still a count of two, false the moment the notes commit is in the range. The digit was never the thing that made it break.

State the predicate over the range rather than its size. The shipped wording is already in the file and is reused verbatim:

> It is a `patch`: no commit in the range is a `feat`, none carries a `!` marker or a `BREAKING CHANGE` footer, and nothing is deprecated, renamed or removed.

`no commit` and `none` hold at two commits or thirty. `both`, `neither`, `either` and `the two fixes` do not — nor does a count of files, issues or PRs taken before the section is committed.

**A count is safe only once the range is closed.** v0.15.0 and v0.16.0 each say "two commits in the range are a `feat`" and both are permanently true, because the tag ending their range already exists. That is the whole distinction: the section you are writing has an open range, and every section above a tag has a closed one. So this is not a ban on numbers in the file — it is a ban on counting the release you are in the middle of cutting.

Where a quantity is genuinely worth stating, **name the things instead of counting them**. v0.16.0 names the colour control and the date control, which is what makes that sentence useful and is also what would have survived another commit landing.

## Inserting the section

**Anchor the insert on the heading *and* poveste's compare link, never the heading alone.** `CHANGELOG.md` holds poveste's releases above the inherited histoire changelog, and histoire's version numbers run higher because poveste restarted at `0.1.0` — so a poveste heading can have an exact twin 1600 lines below it:

```bash
$ git show origin/next:CHANGELOG.md | grep -n '^## v0\.16\.0'
7:## v0.16.0
1626:## v0.16.0
```

A replace-first insert hits the right one today by accident of ordering, and writes a poveste section into histoire's history the first time the numbers line up the other way. `## v<version>` plus `[compare changes](https://github.com/poveste-dev/poveste/compare/...)` is unique. Assert the match is unique before writing rather than trusting the count — the failure is silent, and this file is published verbatim.

**The twin exists for the version you are writing, not only for older ones**, and it catches *reads* as well as inserts. histoire released a v0.16.1 too, so `sed -n '/^## v0.16.1/,/^## v0.16.0/p'` opens a second range at histoire's heading and returns both sections — which is how an audit of the numbers in a section came back holding histoire's commit hashes. Read the section by the line numbers `grep -n` gives you, or scope to the half of the file above the inherited changelog.

## If the workflow fails

`release.yml` waits for `test.yml` to be green on the tagged commit before building. The bump goes straight to `main`, bypassing branch protection, so it is the one published commit no required check ever cleared — that wait is the substitute. If it is red, re-run `test.yml`; once green, re-run the release job. Nothing is published in the meantime.

The release is created as a **draft** and published only after the packages are verified on npm, because publishing is what sends the email. If the run fails before that, the draft stays unpublished and the last step says so.

`major` is never reached this way — it is a deliberate stability declaration with its own checklist.
