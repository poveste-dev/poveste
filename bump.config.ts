import { defineConfig } from 'bumpp'

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
export default defineConfig({
  recursive: true,
  commit: 'chore: release v%s',
  tag: 'v%s',
  push: true,
})
