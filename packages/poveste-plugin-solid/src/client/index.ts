export { default as MountStory } from './MountStory.js'
export { default as RenderStory } from './RenderStory.js'

/**
 * Exported though it generates nothing: the source panel early-returns when a
 * plugin has none, and would then skip its switch to the story file (#61, #1115).
 * Solid compiles JSX to DOM operations and keeps no render tree to read source
 * back out of, which is what `plugin-vue`'s codegen walks.
 */
export function generateSourceCode(): undefined {
  // noop
}
