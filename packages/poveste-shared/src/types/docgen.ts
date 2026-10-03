/**
 * Auto-docs: what a framework extractor reads off a component, and the contract
 * between it and the shell that decides when it runs (#159, #1159).
 */

export interface DocTag {
  name: string
  text?: string
}

export interface DocProp {
  name: string
  description?: string
  type: string
  required: boolean
  /** The default the code applies, which wins over the tag when both exist. */
  default?: string
  /** The default a `@default` or `@defaultValue` tag states. */
  defaultTag?: string
  tags: DocTag[]
}

export interface DocSlot {
  name: string
  description?: string
  type?: string
  tags: DocTag[]
}

export interface DocEvent {
  name: string
  description?: string
  type?: string
  tags: DocTag[]
}

export interface ComponentDoc {
  props: DocProp[]
  slots: DocSlot[]
  events: DocEvent[]
}

/**
 * One framework's extractor, created inside the docgen worker the first time a
 * component of its kind is asked for. It may hold a type checker, which is the
 * memory this whole design is about: `dispose` must let it go.
 */
export interface DocgenExtractor {
  extract: (file: string) => ComponentDoc | undefined | Promise<ComponentDoc | undefined>
  /** A file changed on disk. Called for any file, not only components. */
  update?: (file: string) => void | Promise<void>
  dispose: () => void | Promise<void>
}

export interface DocgenExtractorContext {
  /** The book's root. */
  root: string
  /** Whatever the plugin passed as `docgen.options`. */
  options: unknown
}

/** The shape of the module a plugin names in `docgen.module`. */
export interface DocgenExtractorModule {
  createExtractor: (context: DocgenExtractorContext) => DocgenExtractor | Promise<DocgenExtractor>
}

export interface PluginDocgen {
  /** Whether a resolved file is a component this plugin documents. */
  match: (file: string) => boolean
  /**
   * An absolute path or `file:` URL to a module exporting `createExtractor`. It is
   * imported in a worker thread, so it travels as a specifier rather than a function.
   */
  module: string
  /** Passed to `createExtractor`; it has to survive a structured clone. */
  options?: unknown
}
