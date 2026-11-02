import type { ServerRunPayload } from '@poveste/shared'
import { collectStory } from './story.js'

export async function run({ file, el, storyData }: ServerRunPayload) {
  const { default: Comp } = await import(/* @vite-ignore */ file.moduleId)
  await collectStory(Comp, { file, el, storyData })
}
