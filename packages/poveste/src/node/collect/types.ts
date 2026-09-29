import type { ServerStory, ServerStoryFile } from '@poveste/shared'

// These are the worker's payload and reply, but they live here rather than in
// `worker.ts` so that `index.ts` and `task.ts` can name them without importing
// it. Importing the worker — even `import type` — pulls in `dom/env.ts` and
// `@types/jsdom`, whose `/// <reference lib="dom" />` puts the DOM lib back
// into every program that can reach it. See `tsconfig.server.json`.

export interface Payload {
  root: string
  base: string
  storyFile: ServerStoryFile
  defineGlobals?: Record<string, unknown>
}

export interface ReturnData {
  storyData: ServerStory[]
}
