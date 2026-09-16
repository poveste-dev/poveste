// `.git/hooks` belongs to the clone, not to a worktree, and simple-git-hooks
// writes each file once at install. So a hook is live in checkouts that never
// installed it — an older branch, a bisect, another worktree — and whatever it
// needs may simply not be there.
//
// That is why the test is inline. A guard script in the tree would be missing
// on exactly the branches it exists to protect.

/**
 * Step aside, saying so, when `test` fails rather than failing the git action.
 *
 * `remedy` is part of the point: a message that names the wrong fix costs the
 * reader the same time as no message at all.
 */
function unless(test, needs, remedy = 'Run pnpm install on a branch that has it') {
  return `${test} || { echo "[poveste] ${needs} is not available here, so this hook is being skipped. ${remedy} (see #18)."; exit 0; }`
}

const hook = (...lines) => lines.join('\n')

export default {
  'pre-commit': hook(
    unless('[ -x node_modules/.bin/lint-staged ]', 'lint-staged'),
    'pnpm exec lint-staged',
  ),

  'commit-msg': hook(
    unless('[ -x node_modules/.bin/commitlint ] && [ -f commitlint.config.mjs ]', 'commitlint'),
    'pnpm exec commitlint --edit "$1"',
  ),

  // Refuses a push carrying a tag no release made (#457). Reads the ref list on
  // stdin, so nothing else in this hook may consume it.
  //
  // The second test is not redundant with the first. The guard runs a `.ts`
  // file through bare `node`, which is whatever the contributor's shell
  // defaults to — and CONTRIBUTING expects that to be older than
  // `.node-version` sometimes. Node below 22.18 cannot strip types and exits
  // non-zero, which would block the push rather than step aside.
  // `process.features.typescript` is the feature itself, so it stays right as
  // the floor moves.
  'pre-push': hook(
    unless('[ -f scripts/hooks/pre-push-tags.ts ]', 'the tag guard'),
    unless(
      'node -e "process.exit(process.features.typescript ? 0 : 1)" 2>/dev/null',
      'a Node that can run TypeScript',
      'Use the version in .node-version, e.g. fnm use',
    ),
    'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/hooks/pre-push-tags.ts',
  ),
}
