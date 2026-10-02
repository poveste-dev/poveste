export { default as MountStory } from './MountStory.js'
export { default as RenderStory } from './RenderStory.js'

/**
 * Exported though it generates nothing: the source panel early-returns when a
 * plugin has none, and would then skip its switch to the story file (#61, #1115).
 * `plugin-vue`'s codegen turns a render tree back into source; React elements
 * carry no source to recover, so the panel shows the story file instead.
 */
export function generateSourceCode(): undefined {
  // noop
}
