import antfu from '@antfu/eslint-config'

export default antfu({
  // Off deliberately, not pending. antfu 9 turns on eslint-plugin-pnpm when it
  // sees a workspace catalog, and its `pnpm/json-enforce-catalog` rule wants
  // all 167 of our dependencies moved into the catalog — then rewrites
  // `pnpm-workspace.yaml` to match, on a plain `eslint .` with no `--fix`.
  //
  // A linter that writes to the workspace manifest during a read-only run is
  // disqualifying on its own, and upstream still calls the whole block
  // experimental. The catalog is for deps that must stay in lockstep across
  // packages; putting every dependency in it is a different policy, and one
  // worth adopting on purpose rather than inheriting from a lint default.
  pnpm: false,
  ignores: [
    '**/poveste-dist/',
    '**/generated/',
    '**/public/',
    '**/.svelte-kit/',
  ],
}, {
  rules: {
    'curly': ['error', 'multi-line', 'consistent'],
    'antfu/if-newline': 'off',
    'antfu/no-import-dist': 'off',
    'node/prefer-global/process': 'off',
    'no-console': 'warn',
    // Warn, not error: every remaining hit is a `ref`/`computed` referenced
    // from a closure defined above it, which is legal and common in
    // `<script setup>`. Reordering to satisfy the rule would put the setup
    // code below the plumbing it drives, which reads worse than the warning.
    'ts/no-use-before-define': 'warn',
  },
}, {
  files: ['**/*.vue'],
  rules: {
    'import/first': 'off',
  },
}, {
  // `poveste` is a CLI. Build progress, the dev-server URL and collection
  // diagnostics are its output, not stray debugging — same for the plugins
  // that report their own progress. Warning on them buried the one console
  // call that is worth a second look (`poveste-app/src/app/util/events.ts`).
  files: [
    'packages/poveste/src/node/**',
    'packages/poveste-plugin-*/src/**',
  ],
  rules: {
    'no-console': 'off',
  },
}, {
  // Demo code: several example stories log on purpose to show event handling.
  // Kept to a directory glob — a filename pattern like `**/*.story.*` forces
  // eslint to lint every matching file, which drags `.story.svelte` in with no
  // parser configured for it (see #60 on enabling the svelte config).
  files: ['examples/**'],
  rules: {
    'no-console': 'off',
  },
}, {
  // The preview components report readiness by writing `previewReady` onto the
  // variant object they were handed. That object is app-wide state — the store
  // owns it and the grid, the side panel and the events pane all read the flag
  // back off it — so the mutation is the mechanism, not an accident. Moving it
  // into the store is a real refactor; scoped off here rather than repo-wide so
  // an accidental prop mutation elsewhere still fails the build.
  files: ['packages/poveste-app/src/app/components/story/StoryVariant*.vue'],
  rules: {
    'vue/no-mutating-props': 'off',
  },
})
