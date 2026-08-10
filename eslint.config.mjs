import antfu from '@antfu/eslint-config'

export default antfu({
  // antfu 9 turns on eslint-plugin-pnpm when it sees a workspace catalog. Its
  // `pnpm/json-enforce-catalog` rule wants all 167 of our dependencies moved
  // into the catalog, and it rewrites `pnpm-workspace.yaml` while doing so —
  // on a plain `eslint .`, no `--fix` needed. Upstream still calls the whole
  // block experimental. Whether to catalog everything is its own decision,
  // not a side effect of a lint run.
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
    'ts/no-use-before-define': 'warn',
    'vue/define-macros-order': 'off', // Bugged
    'unused-imports/no-unused-vars': 'off', // Bugged on catch : https://github.com/sweepline/eslint-plugin-unused-imports/issues/105
  },
}, {
  files: ['**/*.vue'],
  rules: {
    'import/first': 'off',
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
