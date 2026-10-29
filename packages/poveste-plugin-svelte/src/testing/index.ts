import type { Component } from 'svelte'
import { describeStories } from '@poveste/shared/testing'
import { MountStory, RenderStory } from '../client/index.js'
import { collectStory } from '../collect/story.js'

export interface TestStoriesOptions {
  /** The outer `describe`'s name. The story file's name by default. */
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
 * error from the story or a setup hook, a rejected `initState`, or anything
 * printed with `console.error` or `console.warn`.
 *
 * ```ts
 * import { testStories } from '@poveste/plugin-svelte/testing'
 * import Badge from './Badge.story.svelte'
 *
 * testStories(Badge)
 * ```
 */
export function testStories(story: Component<any>, options: TestStoriesOptions = {}): void {
  // Svelte names a compiled component after its file: `Badge.story.svelte` is `Badge_story`.
  const name = options.name ?? (story.name?.replace(/_story$/, '') || 'stories')
  describeStories({
    supportPluginId: 'svelte4',
    collect: async (component, payload) => collectStory(component, payload),
    MountStory,
    RenderStory,
  }, story, { name, timeout: options.timeout })
}
