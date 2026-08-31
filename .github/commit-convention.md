# Commit message convention

Poveste uses [Conventional Commits](https://www.conventionalcommits.org). This document describes what this project actually does with them, which is not quite what the specification's usual tooling does.

```
<type>(<scope>): <subject>

<body>

<footer>
```

The header is required. The scope is optional.

## Types

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert`

That set comes from [`conventional-commit-types`](https://github.com/commitizen/conventional-commit-types), which is the default list used by `amannn/action-semantic-pull-request`. [`pr-title.yml`](./workflows/pr-title.yml) runs that action with no `types` input, so the default is what the required check enforces — nothing here needs to be kept in step with it by hand.

A pull request is squashed on merge, so **its title becomes the commit subject**. The check runs on the title for that reason.

## The subject

- imperative, present tense — "change", not "changed" or "changes"
- no capital first letter
- no full stop at the end
- **long enough to stand on its own**

There is no length limit, and there never really was one here. The subject is the release-note line a stranger reads in their inbox, so it has to carry the change by itself:

```
fix(plugin-nuxt): build into .nuxt/poveste so a story build leaves the host untouched
```

Ninety characters, and every one of them is doing work. Cut to fifty it would say "build into .nuxt/poveste" and tell nobody why that matters. The median subject on `main` is around seventy characters and the longest is a hundred and nine; that is the convention, not a series of violations of one.

### Never start a subject with a bare `@word`

Release bodies are built from commit subjects, so `@layer` or `@scope` at the start becomes a real @-mention of whichever stranger owns that GitHub handle. Write "the layer API" or `` `@layer` `` in backticks instead.

### Don't write a closing keyword you don't mean

GitHub matches `close`, `fix` and `resolve` before an issue number and ignores the words around them, so **"this does not close #75" closes #75** — which is how that issue got closed. Reference without a keyword: `see #75`, `related to #75`.

## Body and footer

Same voice as the subject. The body is for motivation and contrast with the previous behaviour — *why*, not *what*; the diff already says what.

The footer carries breaking changes and issue references. A breaking change starts with `BREAKING CHANGE:` on its own line.

Hard-wrap commit bodies normally. The one-line-per-paragraph rule this project uses for markdown does not apply here — `git log` does no reflowing.

## How this reaches a release

Two things read these commits, and only one of them is a tool.

**changelogithub** generates a commit list that is appended to the release body. Its groups are the ones in [`CHANGELOG.md`](../CHANGELOG.md) — 🚀 Enhancements, 🩹 Fixes, 📖 Documentation, ✅ Tests, 🤖 CI, 🏡 Chore, 🚨 Breaking Changes. There is no "Features" heading, no per-scope subheading, and no rule that only `feat`/`fix`/`perf` appear: `docs` and `chore` entries are in every recent release.

**A person** writes the `CHANGELOG.md` section by hand before the tag, and that section is what the release body leads with. Nothing generates it and nothing can — it is where "what changed" becomes "what you have to do about it". [`CONTRIBUTING.md`](../CONTRIBUTING.md#changelogmd) has the procedure.

So a type does not decide whether a change is in the notes. A person does, by asking whether a consumer can see it.

## Reverts

A commit that undoes another starts with `revert: ` followed by the reverted header, and says `This reverts commit <hash>.` in the body.

`revert` is also a valid type, so `revert(app): …` passes the title check too. Prefer the `revert: ` form, because it keeps the original subject visible in the log.
