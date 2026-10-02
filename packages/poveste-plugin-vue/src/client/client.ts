export * from './app/index.js'
export * from './codegen.js'

declare module '@poveste/shared' {
  interface StoryMeta {
    hasVariantChildComponents?: boolean
  }
}
