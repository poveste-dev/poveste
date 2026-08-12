import { defineConfig } from 'bumpp'
import semver from 'semver'

// Recursive so every workspace package.json is bumped in lockstep — no need to
// maintain an explicit file list when packages are added or removed. Private
// packages (examples/*, docs, controls-stories) are swept too; that's harmless
// since `pnpm -r publish` skips them. The `v%s` tag matches the trigger in
// .github/workflows/release.yml (`tags: - 'v*'`).
//
// Released with `pnpm release <patch|minor|major>`. The `release` script ends
// in a bare `--release` on purpose: pnpm appends run args to the end of the
// command string, so the version type lands as that flag's value. Don't add
// anything after it, and don't reach for `pnpm release -- --release patch` —
// bumpp's parser treats everything past `--` as positional file arguments, so
// the type is read as a filename and it drops to an interactive prompt.
//
// Passing the flag yourself is the one that bites: `pnpm release --release
// minor --yes` expands to `--release --release minor --yes`, so `--release`
// takes `--release` as its value, the version resolves to
// `undefined.undefined.undefined`, and bumpp is happy to write that into every
// file, commit it, tag it and push it (#188).
//
// `execute` is the last point that can still say no. It runs after the files
// are written but before the commit, so throwing here leaves a dirty worktree —
// `git checkout -- '*package.json'` — and nothing else: no commit, no `v*` tag,
// therefore no release.yml run and no npm publish. bumpp exits 1.
export default defineConfig({
  recursive: true,
  commit: 'chore: release v%s',
  tag: 'v%s',
  push: true,

  execute({ state }) {
    const { currentVersion, newVersion } = state

    if (!semver.valid(newVersion)) {
      throw new Error(
        `Refusing to release "${newVersion}" — not a valid version.\n`
        + `  This is what a malformed invocation looks like. Drop the bumped files with\n`
        + `    git checkout -- '*package.json'\n`
        + `  then release with the type as a bare argument:\n`
        + `    pnpm release patch    # or minor, major`,
      )
    }

    if (!semver.gt(newVersion, currentVersion)) {
      throw new Error(
        `Refusing to release ${newVersion} — it is not greater than ${currentVersion}.\n`
        + `  Drop the bumped files with: git checkout -- '*package.json'`,
      )
    }
  },
})
