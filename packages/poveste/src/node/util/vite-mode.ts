import type { ConfigMode } from '@poveste/shared'

/**
 * poveste's `ConfigMode` in the vocabulary Vite's own API speaks.
 *
 * The two are different axes with overlapping words, and handing one straight
 * to the other means a user config written the standard way — `mode ===
 * 'production' ? … : …` — takes neither branch (#349).
 *
 * Only for calls into Vite. The `vite(config, { mode })` hook poveste exposes
 * documents `mode` as `'dev' | 'build'` and keeps it.
 */
export function viteMode(mode: ConfigMode): 'development' | 'production' {
  return mode === 'dev' ? 'development' : 'production'
}

export function viteCommand(mode: ConfigMode): 'serve' | 'build' {
  return mode === 'dev' ? 'serve' : 'build'
}
