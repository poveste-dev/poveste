import { defineConfig } from 'bumpp'

// Recursive so every workspace package.json is bumped in lockstep — no need to
// maintain an explicit file list when packages are added or removed. Private
// packages (examples/*, docs, controls-stories) are swept too; that's harmless
// since `pnpm -r publish` skips them. The `v%s` tag matches the trigger in
// .github/workflows/release.yml (`tags: - 'v*'`).
//
// Released with `pnpm release <patch|minor|major>`, which goes through
// scripts/release.ts. That script resolves the next version, checks it is valid
// semver and greater than the current one, and only then calls bumpp with an
// explicit version — so nothing here ever sees a type it has to interpret.
//
// It used to be a bare `--release` at the end of the script, relying on pnpm
// appending the type as that flag's value. Passing the flag yourself made
// `--release` consume `--release`, and `undefined.undefined.undefined` was
// written into every file below, tagged, and pushed (#188).
export default defineConfig({
  recursive: true,
  commit: 'chore: release v%s',
  tag: 'v%s',
  push: true,
})
