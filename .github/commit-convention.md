# Commit message convention

Poveste uses [Conventional Commits](https://www.conventionalcommits.org). This document describes what this project actually does with them, which is not quite what the specification's usual tooling does.

```
<type>(<scope>): <subject>

<body>

<footer>
```

The header is required. The scope is optional.

Two things enforce this, at different moments and for different reasons. A `commit-msg` hook runs [commitlint](https://commitlint.js.org) over the message you just wrote, so a rule you tripped is a rule you fix while the change is still in your head — it is local, and `git commit --no-verify` steps past it. The required check on the **pull request title** is the one that decides, because a squash merge makes that title the commit subject and the message this hook saw is discarded.

So the hook is a rehearsal and the title check is the performance. Where a rule below is a warning rather than an error, that is deliberate: it is worth a moment's thought and not worth blocking a commit over.

## Scopes

Package names first, then the areas that are not packages:

| | |
| --- | --- |
| **Packages** | `app` · `controls` · `node` · `shared` · `vendors` |
| **Framework surfaces** | `vue` · `svelte` · `nuxt` · `quasar` · `percy` · `screenshot` · `tailwind` |
| **Everything else** | `repo` · `ci` · `docs` · `guide` · `examples` · `e2e` · `deps` |

A framework surface is the plugin package *and* the example books that teach it, the same span as the matching `a:` label — so `fix(nuxt)`, not `fix(plugin-nuxt)`, and `fix(svelte)` for a defect in the SvelteKit example's own source.

There is deliberately no `reference` to match `guide`, though `docs/reference/` exists: a reference page is scoped by what it documents, not by the directory it sits in. All six commits that have touched `docs/reference/` already did that — `docs(svelte)`, `docs(node)`, `fix(app)` — and a second plausible answer for one change is how two people scope it differently.

Three folds are worth naming because history contains the unfolded form: the CHANGELOG and the release script are `repo`, since `repo` is the repository as a published artifact; `build`, `dev` and `collect` are `node`; and `examples` covers a book that is not one of the framework surfaces above, such as `sveltekit` or `vike`.

The list is a warning, not a gate. A scope nobody anticipated is worth a nudge and a moment's thought, and sometimes the answer is to add it here — [`commitlint.config.mjs`](../commitlint.config.mjs) holds the copy the tool reads, and this table is the one people read. Change both.

## Types

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert`

That set comes from [`conventional-commit-types`](https://github.com/commitizen/conventional-commit-types), which is the default list used by `amannn/action-semantic-pull-request`. [`pr-title.yml`](./workflows/pr-title.yml) runs that action with no `types` input, so the default is what the required check enforces — nothing here needs to be kept in step with it by hand.

A pull request is squashed on merge, so **its title becomes the commit subject**. The check runs on the title for that reason.

## The subject

- imperative, present tense — "change", not "changed" or "changes"
- no capital first letter
- no full stop at the end
- **long enough to stand on its own**

The ceiling is ninety characters, and it is a ceiling rather than a target. The subject is the release-note line a stranger reads in their inbox, so it has to carry the change by itself:

```
fix(nuxt): build into .nuxt/poveste so a story build leaves the host untouched
```

Seventy-eight characters, and every one of them is doing work. Cut to fifty it would say "build into .nuxt/poveste" and tell nobody why that matters. The median subject since v0.8.0 is seventy-five characters; the fifty-character habit other projects have is what this convention is written against.

Ninety is not a measurement of past practice — sixteen of the two hundred and nine subjects since v0.8.0 are longer than that as they were written, and the longest is a hundred and twenty-five. It is a decision that those were too long: past a certain width a subject has stopped being a line and started being a paragraph, and the second clause belongs in the body, not abbreviated away.

The limit is on what you write, not on what lands. GitHub appends ` (#123)` when it squashes, so a subject that just fits here is seven or eight characters over by the time it is in the log — twenty-four of those same two hundred and nine exceed ninety once landed, against sixteen as authored. Both counts are of the same commits; they differ only in which string was measured, which is worth knowing before you re-derive one and take the other for a mistake.

### Never start a subject with a bare `@word`

Release bodies are built from commit subjects, so `@layer` or `@scope` at the start becomes a real @-mention of whichever stranger owns that GitHub handle. Write "the layer API" or `` `@layer` `` in backticks instead.

### Don't write a closing keyword you don't mean

GitHub matches `close`, `fix` and `resolve` before an issue number and ignores the words around them, so **"this does not close #75" closes #75** — which is how that issue got closed. Reference without a keyword: `see #75`, `related to #75`.

## Body and footer

Same voice as the subject. The body is for motivation and contrast with the previous behaviour — *why*, not *what*; the diff already says what.

The footer carries breaking changes and issue references. A breaking change starts with `BREAKING CHANGE:` on its own line.

### Never mark a breaking change with `!`

The specification allows `feat(node)!: …` as a second spelling of the same thing. This project uses the footer and only the footer, so there is nothing to choose between: one `BREAKING CHANGE:` footer exists in the two hundred and nine commits since v0.8.0 and no `!` marker does.

Two spellings would cost the release pass. Whoever writes the `CHANGELOG.md` section by hand reads one of them, and a breaking change wearing the other goes out unannounced — which for a breaking change is the whole failure.

Hard-wrap commit bodies normally. The one-line-per-paragraph rule this project uses for markdown does not apply here — `git log` does no reflowing.

## How this reaches a release

Two things read these commits, and only one of them is a tool.

**changelogithub** generates a commit list that is appended to the release body. Its groups are the ones in [`CHANGELOG.md`](../CHANGELOG.md) — 🚀 Enhancements, 🩹 Fixes, 📖 Documentation, ✅ Tests, 🤖 CI, 🏡 Chore, 🚨 Breaking Changes. There is no "Features" heading, no per-scope subheading, and no rule that only `feat`/`fix`/`perf` appear: `docs` and `chore` entries are in every recent release.

**A person** writes the `CHANGELOG.md` section by hand before the tag, and that section is what the release body leads with. Nothing generates it and nothing can — it is where "what changed" becomes "what you have to do about it". [`CONTRIBUTING.md`](../CONTRIBUTING.md#changelogmd) has the procedure.

So a type does not decide whether a change is in the notes. A person does, by asking whether a consumer can see it.

## Reverts

A commit that undoes another starts with `revert: ` followed by the reverted header, and says `This reverts commit <hash>.` in the body.

```
revert: fix(app): admit the null that means auto

This reverts commit 4f2c9a10.

The null also reaches the resize handler, which read it as zero.
```

`revert` is also a valid type, so `revert(app): …` passes the title check too. Prefer the `revert: ` form, because it keeps the original subject visible in the log.

Say why in the body. A revert with no reason is indistinguishable from a mistake, and the next person to try the same change has nothing to read.
