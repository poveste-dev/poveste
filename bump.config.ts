import { defineConfig } from 'bumpp'

// Recursive so every workspace package.json is bumped in lockstep — no need to
// maintain an explicit file list when packages are added or removed. Private
// packages (examples/*, docs, controls-stories) are swept too; that's harmless
// since `pnpm -r publish` skips them. The `v%s` tag matches the trigger in
// .github/workflows/release.yml (`tags: - 'v*'`).
//
// Released with `pnpm release <patch|minor|major>`, which is `scripts/release.ts`
// — it reads the type, runs bumpp, then pushes the commit and `v<version>` by
// name.
//
// `push: false` is the point of that script. bumpp's push is `git push` followed
// by `git push --tags`, which publishes every tag on the machine rather than the
// one it just made; cutting v0.10.0 also published a maintainer's private
// `salvage/…` tag that way (#457). `release.ts` passes `--no-push` as well, so it
// stays correct if this is ever flipped back.
export default defineConfig({
  recursive: true,
  commit: 'chore: release v%s',
  tag: 'v%s',
  push: false,
})
