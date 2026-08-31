---
name: open-pr
description: >-
  Open a pull request in the poveste repo with its conventions — target `next` rather than `main`,
  a title that passes the required conventional-commit check and becomes the release-note line, and
  a body that says how the change was verified. Use when asked to open, create or submit a pull
  request, to stack one PR on another, or to write a PR description in this repository.
---

# Opening a PR in poveste

## Target `next`

Not `main`. `next` is the integration branch and reaches `main` as a fast-forward when a release is cut, which is why it is kept rebased rather than merged. Branching off `main` for anything multi-step is wrong before it starts.

Use `git worktree add` rather than switching the shared checkout — it may have a dev server or a build running against it.

## Stacked PRs

For a queue of related work, base each branch on the previous one and say so in the first line of the body, because the GitHub diff otherwise shows the whole stack:

```
Closes #123. Stacked on #456 — review the last commit only.
```

`git rebase --onto <new-base> <old-base> <tip> --update-refs` moves a whole stack at once and updates the intermediate branch refs. Re-verify afterwards: the base changed, so the checks that passed do not automatically still apply.

## The title

The PR is squashed on merge, so **its title becomes the commit subject and the release-note line**. `pr-title.yml` runs `amannn/action-semantic-pull-request` as a required check, using its default type list from `conventional-commit-types`.

- imperative, lowercase, no trailing full stop
- long enough to stand alone in a release note — there is no length limit, and the median subject on `main` is around seventy characters
- **never start with a bare `@word`**: release bodies are built from subjects, so `@layer` becomes a real @-mention of a stranger who owns that handle

See `.github/commit-convention.md`.

## The body

The template asks for what changed and why, how it was verified, and a checklist. Fill in the verification honestly — name what you ran, and say what you did *not* cover. "CI is green" is worth writing only if CI actually exercises the change.

If you found and corrected a wrong premise in the issue, say so in the body. That is usually the most useful thing in it.

**Do not write a closing keyword you do not mean.** GitHub matches `close`/`fix`/`resolve` before an issue number and ignores the surrounding words, so "this does not close #75" closes #75 — which is how that issue got closed. Write `see #75` instead.

**No AI attribution** — no `Co-Authored-By` trailers, no generated-with footers.

## Before pushing

Read the lint output rather than assuming. `pnpm lint:fix` reformats whatever it touches, including files you never opened, so check `git status` and revert unrelated churn.

## After merge

Close the issue when the fix lands on `next`, with a PR reference and the `on:next` label, rather than waiting for the release — but confirm the fix actually landed first. An issue mentioned in a diff is often incidental.
