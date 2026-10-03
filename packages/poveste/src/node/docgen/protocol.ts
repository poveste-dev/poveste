import type { ExtractResult } from './engine.js'

export type DocgenRequest
  = | { id: number, type: 'extract', requests: { name: string, file: string }[] }
    | { id: number, type: 'update', file: string }
    | { id: number, type: 'dispose' }

export interface DocgenResponse {
  id: number
  results?: Record<string, ExtractResult>
  stats?: { created: number, recycled: number }
}

/** What the dev server sends a client that asked for a story's docs. */
export interface StoryDocsResult {
  storyId: string
  /** Keyed by component file, relative to the book's root. */
  components: Record<string, ExtractResult>
}
