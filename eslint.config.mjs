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
  // Until this was switched on, every `.svelte` file in the repo — including
  // the eight shipped sources in `@poveste/plugin-svelte` — was reported as
  // "File ignored because no matching configuration was supplied".
  svelte: true,
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
  // Two base rules that cannot see through Svelte's prop syntax. The docs
  // pages carry svelte code fences, so they need the same treatment.
  //
  // `import/no-mutable-exports`: `export let` is how a Svelte 4 component
  // declares a prop, so it fired on every single one — 39 hits, none real.
  //
  // `no-import-assign`: our documented way to type the story prop is
  // `import type { Hst } from '@poveste/plugin-svelte'` followed by
  // `export let Hst: Hst`. The import is type-only, so there is no runtime
  // binding being reassigned — the rule just sees the shared name.
  files: [
    '**/*.svelte',
    '**/*.md/**',
  ],
  rules: {
    'import/no-mutable-exports': 'off',
    'no-import-assign': 'off',
  },
}, {
  // The example links with plain `href='/about'`. The rule wants SvelteKit's
  // `resolve()`, which matters when an app is served under a base path — this
  // one is not, and it exists to demo poveste rather than Kit routing style.
  files: ['examples/sveltekit/**'],
  rules: {
    'svelte/no-navigation-without-resolve': 'off',
  },
}, {
  // antfu overrides this to single quotes; the rule's own default is double,
  // and double is what every markup attribute in this repo already used —
  // Svelte and Vue alike — plus what the SvelteKit template generates. Left
  // alone it rewrote 157 attributes, including the snippets in docs/.
  //
  // `.svelte` only: on a markdown code fence the rule throws outright
  // ("Cannot destructure property 'svelteParseContext'"), because the virtual
  // file never goes through svelte-eslint-parser.
  files: ['**/*.svelte'],
  rules: {
    'svelte/html-quotes': ['error', { prefer: 'double' }],
  },
})
