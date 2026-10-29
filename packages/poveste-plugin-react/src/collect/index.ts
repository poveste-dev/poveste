import type { ServerRunPayload } from '@poveste/shared'
import type { StoryOptions } from '../types.js'
import { collectStory } from './story.js'

// Collection reads the story object and nothing else: no `render` is called, so
// no Solid component runs while the book is being indexed.
export async function run({ file, storyData }: ServerRunPayload) {
  const { default: options } = await import(/* @vite-ignore */ file.moduleId) as { default: StoryOptions }
  collectStory(options, { file, storyData })
}
