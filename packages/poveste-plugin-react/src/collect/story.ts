import type { ServerRunPayload, ServerStory } from '@poveste/shared'
import type { StoryOptions } from '../types.js'
import { variantOptions } from '../types.js'

/** The story a file's `defineStory` options describe, as a story test reads them from its own import. */
export function collectStory(options: StoryOptions, { file, storyData }: Pick<ServerRunPayload, 'file' | 'storyData'>): void {
  const story: ServerStory = {
    id: options.id ?? file.id,
    title: options.title ?? file.fileName,
    group: options.group,
    layout: options.layout ?? { type: 'single', iframe: true },
    icon: options.icon,
    iconColor: options.iconColor,
    docsOnly: options.docsOnly ?? false,
    ...options.autoDocs !== undefined ? { autoDocs: options.autoDocs } : {},
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
