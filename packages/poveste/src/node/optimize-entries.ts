import type { PovesteConfig } from '@poveste/shared'
import { globbySync } from 'globby'
import { resolve } from 'pathe'

// Vite pre-bundles whatever its dependency scanner reaches by crawling
// `optimizeDeps.entries`. Two things in a book route around that scan:
//
//   - stories are loaded dynamically, never statically imported from the app entry
//   - the setup file is reached through `virtual:$poveste-setup`, an id the scanner
//     cannot resolve
//
// So a dependency used only in a story or a setup file is discovered on first
// navigation instead, and Vite answers with `optimized dependencies changed.
// reloading` — a full reload that drops the preview's scroll and state (#282).
//
// The stories are resolved here rather than handed over as patterns, because
// `storyIgnored` cannot be expressed as entry patterns. Vite globs the whole entries
// array together, so a `!**/dist/**` negation would also match `APP_PATH`, which *is*
// `<poveste-app>/dist` — silently dropping the app's own scan entries. Resolving the
// files gives `storyIgnored` its exact meaning and cannot touch anything else.
export function optimizeEntries(
  config: Pick<PovesteConfig, 'storyMatch' | 'storyIgnored' | 'setupFile'>,
  root: string,
  isServer: boolean,
): string[] {
  // Same call the collector makes, so the scanner sees exactly the story set the
  // book will load — no stale `dist/` copies the book itself excludes.
  const stories = globbySync(config.storyMatch, {
    cwd: root,
    ignore: config.storyIgnored,
    absolute: true,
  })

  const setup = setupFileEntry(config.setupFile, isServer)
  return setup ? [...stories, resolve(root, setup)] : stories
}

// Mirrors how `virtual/vite-plugin.ts` picks the file. These are documented
// root-relative and written with a leading slash (`/src/setup.ts`), which
// `resolve` would read as absolute.
export function setupFileEntry(setupFile: PovesteConfig['setupFile'], isServer: boolean): string | undefined {
  if (!setupFile) {
    return undefined
  }

  let file: string | undefined
  if (typeof setupFile === 'string') {
    file = setupFile
  }
  else if (isServer && 'server' in setupFile) {
    file = setupFile.server
  }
  else if (!isServer && 'browser' in setupFile) {
    file = setupFile.browser
  }

  return file ? file.replace(/^\/+/, '') : undefined
}
