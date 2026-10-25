import type { ServerRunPayload } from '@poveste/shared'
import { collectComponent } from './collect.js'

export async function run({ file, storyData, el }: ServerRunPayload) {
  const { default: Comp } = await import(/* @vite-ignore */ file.moduleId)
  await collectComponent(Comp, { file, storyData, el })
}
