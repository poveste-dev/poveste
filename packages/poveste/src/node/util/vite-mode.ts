import type { ConfigMode } from '@poveste/shared'

/**
 * poveste's `ConfigMode` in the vocabulary Vite's own API speaks.
 *
 * The two are different axes with overlapping words, and handing one straight
 * to the other means a user config written the standard way — `mode ===
 * 'production' ? … : …` — takes neither branch (#349).
 *
 * The public `vite(config, env)` hook takes it too: `env` is typed as Vite's own
 * `ConfigEnv` in `@poveste/shared`, and its `command` was already translated.
 */
export function viteMode(mode: ConfigMode): 'development' | 'production' {
  return mode === 'dev' ? 'development' : 'production'
}

export function viteCommand(mode: ConfigMode): 'serve' | 'build' {
  return mode === 'dev' ? 'serve' : 'build'
}
