import type { ConfigMode } from '@poveste/shared'

/**
 * Four rather than one per core (#415). A worker builds its module graph from nothing
 * on its first story, so past this a book pays in memory and CPU for no wall clock,
 * unless each of its stories is slow by itself, which `collectMaxThreads` is for.
 */
export const DEFAULT_MAX_THREADS = 4

/** The most workers collection may hold. The pool starts them as stories need them. */
export function threadCeiling(configured: number | undefined, mode: ConfigMode, cores: number): number {
  const maxThreads = configured ?? DEFAULT_MAX_THREADS
  return Math.max(Math.min(maxThreads, mode === 'dev' ? Math.floor(cores / 2) : cores - 1), 1)
}
