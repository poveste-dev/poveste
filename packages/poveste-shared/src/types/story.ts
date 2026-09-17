export interface StoryFile {
  id: string
  supportPluginId: string
  component: any
  story: Story
  path: string[]
  filePath: string
  docsFilePath?: string
  source: () => Promise<{ default: string }>
}

export type StoryLayout = {
  type: 'single'
  iframe?: boolean
  /**
   * Give every render of this story a fresh sandbox document instead of
   * reusing a warm one. Style isolation is the same either way; this is for
   * stories that leave JS state behind — patched globals, leaked timers —
   * that the next occupant of the realm must not see.
   */
  isolate?: boolean
} | {
  type: 'grid'
  width?: number | string
  iframeGrid?: boolean
  /** See the single layout's `isolate`. */
  isolate?: boolean
}

export interface CommonProps {
  id?: string
  title?: string
  icon?: string
  iconColor?: string
}

export interface InheritedProps {
  setupApp?: (payload: any) => unknown
  source?: string
  responsiveDisabled?: boolean
  autoPropsDisabled?: boolean
}

export interface VariantProps extends CommonProps, InheritedProps {
  // No additional properties
}

export interface StoryProps extends CommonProps, InheritedProps {
  group?: string
  layout?: StoryLayout
  docsOnly?: boolean
}

export interface CommonMeta {}

export interface StoryMeta extends CommonMeta {
  /**
   * When set, overrides the global Story Options visibility for this story.
   * `true` forces the right pane visible; `false` forces it hidden.
   * `undefined` (default) defers to the global layout setting.
   */
  storyOptions?: boolean
}

export interface Story {
  id: string
  title: string
  group?: string
  variants: Variant[]
  layout?: StoryLayout
  icon?: string
  iconColor?: string
  docsOnly?: boolean
  file?: StoryFile
  lastSelectedVariant?: Variant
  slots?: () => any
  meta?: StoryMeta
}

export interface VariantMeta extends CommonMeta {}

export interface Variant {
  id: string
  title: string
  icon?: string | undefined
  iconColor?: string | undefined
  setupApp?: ((payload: any) => unknown) | undefined
  slots?: (() => { default: any, controls: any, source: any }) | undefined
  state: any
  source?: string | undefined
  responsiveDisabled?: boolean | undefined
  autoPropsDisabled?: boolean | undefined
  configReady?: boolean | undefined
  previewReady?: boolean | undefined
  meta?: VariantMeta | undefined
}

export interface PropDefinition {
  name: string
  types?: string[] | undefined
  required?: boolean | undefined
  default?: any
}

export interface AutoPropComponentDefinition {
  name: string
  index: number
  props: PropDefinition[]
}

/* SERVER */

export interface ServerStoryFile {
  id: string
  /**
   * Absolute path
   */
  path: string
  /**
   * Relative path
   */
  relativePath: string
  /**
   * File name without extension
   */
  fileName: string
  /**
   * Support plugin (Vue, Svelte, etc.)
   */
  supportPluginId: string
  /**
   * Generated path for tree UI
   */
  treePath?: string[] | undefined
  /**
   * Use the module id in imports to allow HMR
   */
  moduleId: string
  /**
   * Resolved story data from story file execution
   */
  story?: ServerStory | undefined
  /**
   * Data sent to user tree config functions
   */
  treeFile?: ServerTreeFile | undefined
  /**
   * Is virtual module
   */
  virtual?: boolean | undefined
  /**
   * Virtual module code
   */
  moduleCode?: string | undefined
  /**
   * Related markdown docs
   */
  markdownFile?: ServerMarkdownFile | undefined
}

export interface ServerMarkdownFile {
  id: string
  relativePath: string
  absolutePath: string
  isRelatedToStory: boolean
  frontmatter?: any
  html?: string | undefined
  content?: string | undefined
  storyFile?: ServerStoryFile | undefined
}

export interface ServerStory {
  id: string
  title: string
  group?: string | undefined
  variants: ServerVariant[]
  layout?: StoryLayout | undefined
  icon?: string | undefined
  iconColor?: string | undefined
  docsOnly?: boolean | undefined
  docsText?: string | undefined
  meta?: StoryMeta | undefined
}

export interface ServerVariant {
  id: string
  title: string
  icon?: string | undefined
  iconColor?: string | undefined
  meta?: VariantMeta | undefined
}

export interface ServerTreeFile {
  title: string
  path: string
}

export interface ServerTreeLeaf {
  title: string
  index: number
}

export interface ServerTreeFolder {
  title: string
  children: (ServerTreeFolder | ServerTreeLeaf)[]
}

export interface ServerTreeGroup {
  group: true
  id: string
  title: string
  children: (ServerTreeFolder | ServerTreeLeaf)[]
}

export type ServerTree = (ServerTreeGroup | ServerTreeFolder | ServerTreeLeaf)[]

export interface ServerRunPayload {
  file: ServerStoryFile
  storyData: ServerStory[]
  el: HTMLElement
}
