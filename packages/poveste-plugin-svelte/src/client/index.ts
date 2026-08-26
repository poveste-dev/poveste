export { default as MountStory } from './mount.js'
export { default as RenderStory } from './render.js'

declare module '@poveste/shared' {
  interface StoryMeta {
    hasVariantChildComponents?: boolean
  }
}

export function generateSourceCode() {
  // noop
}
