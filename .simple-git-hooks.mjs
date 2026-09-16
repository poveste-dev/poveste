// `.git/hooks` belongs to the clone, not to a worktree, and simple-git-hooks
// writes each file once at install. So a hook is live in checkouts that never
// installed it — an older branch, a bisect, another worktree — and whatever it
// needs may simply not be there.
//
// That is why the test is inline. A guard script in the tree would be missing
// on exactly the branches it exists to protect.

/** Step aside, saying so, when `test` fails rather than failing the git action. */
function unless(test, needs) {
  return `${test} || { echo "[poveste] ${needs} is not available in this working tree, so this hook is being skipped. Run pnpm install on a branch that has it (see #18)."; exit 0; }`
}

const hook = (...lines) => lines.join('\n')

export default {
  'pre-commit': hook(
    unless('[ -x node_modules/.bin/lint-staged ]', 'lint-staged'),
    'pnpm exec lint-staged',
  ),

  // Refuses a push carrying a tag no release made (#457). Reads the ref list on
  // stdin, so nothing else in this hook may consume it.
  'pre-push': hook(
    unless('[ -f scripts/hooks/pre-push-tags.ts ]', 'the tag guard'),
    'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/hooks/pre-push-tags.ts',
  ),
}
