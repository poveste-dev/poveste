---
name: file-an-issue
description: >-
  File an issue in the poveste repo with its conventions — a native GitHub issue type plus an `a:`
  area label, never a milestone or sprint label, and evidence rather than assertion. Use when
  asked to file, open or write up an issue, to record a follow-up or a defect found in passing, or
  to split work out of a change that is getting too large.
---

# Filing an issue in poveste

## Labels

Every issue gets a native GitHub issue **type** — `Bug`, `Feature` or `Task` — and at least one **`a:` area label**:

`a:vue` · `a:svelte` · `a:nuxt` · `a:app` · `a:node` · `a:controls` · `a:plugins` · `a:ci` · `a:repo`

`docs`, `perf`, `chore` and `spike` exist as refinements where `Bug` and `Task` are too coarse.

**Milestones and `sprint:*` labels are the owner's — never set them.** Ordering is expressed with the `blocked` label and GitHub's native dependency links instead.

## Body

Write one line per paragraph. No hard wrapping — it leaves dead space in a split diff and reflows noisily when a sentence changes.

**Show the evidence.** The issues in this repo that were worth acting on carry the command and its output, not a claim:

```
$ git check-ignore -v .../.poveste/screenshots/foo.png
(no match)
```

Measure rather than assert, and be accurate about severity — say what a defect *is not* as well as what it is. An issue that overstates gets discounted; one that says "this is not a quota failure, it is unbounded growth" gets acted on.

**Say what is already known to be fine.** A "checked and clean" section stops the next person re-deriving it.

**Be specific about scope.** A checklist of what would close it, and an explicit note where something is deliberately out of scope or blocked on another issue.

## Before filing

Search first — this repo has a lot of closed issues, and several open ones are the same finding from a different angle. Link what is related.

Check the claims still hold. Issues here go stale: counts drift as the tree changes, and a fix sometimes lands incidentally. An issue asserting something the repo no longer does is worse than none.
