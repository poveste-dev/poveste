import type { ServerRunPayload, ServerStory } from '@poveste/shared'
import type { StoryOptions } from '../types.js'
import { variantOptions } from '../types.js'

// Collection reads the story object and nothing else: no `render` is called, so
// no Solid component runs while the book is being indexed.
export async function run({ file, storyData }: ServerRunPayload) {
  const { default: options } = await import(/* @vite-ignore */ file.moduleId) as { default: StoryOptions }

  const story: ServerStory = {
    id: options.id ?? file.id,
    title: options.title ?? file.fileName,
    group: options.group,
    layout: options.layout ?? { type: 'single', iframe: true },
    icon: options.icon,
    iconColor: options.iconColor,
    docsOnly: options.docsOnly ?? false,
    variants: [],
  }

  story.variants = variantOptions(options).map((variant, index) => ({
    id: variant.id ?? `${story.id}-${index}`,
    title: variant.title ?? 'untitled',
    icon: variant.icon ?? options.icon,
    iconColor: variant.iconColor ?? options.iconColor,
  }))

  storyData.push(story)
}
