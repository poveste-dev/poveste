import type { Story } from '@poveste/shared'
import type { StoryOptions } from '../types.js'
import { describeStories } from '@poveste/shared/testing'
import MountStory from '../client/MountStory.js'
import RenderStory from '../client/RenderStory.js'
import { collectStory } from '../collect/story.js'
import { variantOptions } from '../types.js'

export interface TestStoriesOptions {
  /** The outer `describe`'s name. The story's title by default. */
  name?: string
  /**
   * How long a variant's setup or render may take to settle, in milliseconds:
   * an `initState` still pending then fails the test.
   */
  timeout?: number
}

/**
 * Turns a story file into one test per variant. Each test renders the variant
 * the way the preview does, and fails on what the preview would only log: an
 * error from `render` or a setup hook, a rejected `initState`, or anything
 * printed with `console.error` or `console.warn`.
 *
 * ```ts
 * import { testStories } from '@poveste/plugin-solid/testing'
 * import Badge from './Badge.story'
 *
 * testStories(Badge)
 * ```
 */
export function testStories(story: StoryOptions, options: TestStoriesOptions = {}): void {
  describeStories({
    supportPluginId: 'solid',
    collect: async (component, payload) => collectStory(component, payload),
    MountStory,
    RenderStory,
    narrow: (whole, variant) => {
      const options = whole.file!.component as StoryOptions
      const only = variantOptions(options)[whole.variants.indexOf(variant)]
      return { ...whole, variants: [variant], file: { ...whole.file!, component: { ...options, variants: [only!] } } } as Story
    },
  }, story, { name: options.name ?? story.title ?? 'stories', timeout: options.timeout })
}
