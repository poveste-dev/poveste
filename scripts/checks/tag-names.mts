// What a check is about. Every check carries at least one, so a script filtering
// on a subject cannot skip a check nobody tagged: an untagged file is skipped
// with a green exit (#738).
export const SUBJECT_TAGS = {
  app: 'the app a book is built from',
  ci: 'the workflows and the task graph',
  docs: 'the docs site, the READMEs and the published recipes',
  examples: 'the example books and their wiring',
  release: 'what a release publishes',
  versions: 'the version tables and the Node pins',
}

// What a check cannot run without.
export const NEED_TAGS = {
  build: 'reads built output, so it runs after `pnpm run build`',
  network: 'asks the npm registry or a deployed site',
}

// Types `tags` in a test's options, so a name the config does not define fails
// the typecheck as well as the run.
declare module 'vitest' {
  interface TestTags {
    tags: keyof typeof SUBJECT_TAGS | keyof typeof NEED_TAGS
  }
}
