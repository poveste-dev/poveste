<!--
  The PR title must follow the commit convention — CI checks it and it becomes
  the squashed commit subject and the release-note line:
  https://github.com/poveste-dev/poveste/blob/main/.github/commit-convention.md

  Avoid a bare @word in the title (`@scope`, `@layer`). Release notes are
  generated from these subjects, so it becomes a real @-mention of a stranger.
-->

## What and why

<!-- What changes, and what problem it solves. If the reasoning is not obvious from the diff, this is the place for it. -->

Closes #

## How it was verified

<!--
  What you ran or looked at — a test you added, a command, a page you opened.
  "CI is green" is worth saying only if CI actually covers the change.
-->

## Checklist

- [ ] Tests cover the change, or there is a reason they cannot
- [ ] `pnpm lint`, `pnpm build` and `pnpm test` pass locally
- [ ] Docs updated if behaviour a consumer can see has changed
