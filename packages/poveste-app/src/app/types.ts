import type { RouteLocationRaw } from 'vue-router'

export type {
  Story,
  StoryFile,
  StoryLayout,
  Variant,
} from '@poveste/shared'

export interface TreeLeaf {
  title: string
  index: number
}

export interface TreeFolder {
  title: string
  children: (TreeFolder | TreeLeaf)[]
}

export interface TreeGroup {
  group: true
  id: string
  title: string
  children: (TreeFolder | TreeLeaf)[]
}

export type Tree = (TreeGroup | TreeFolder | TreeLeaf)[]

export type SearchResultType = 'title' | 'docs'

export interface SearchResultBase {
  kind: 'story' | 'variant' | 'command'
  rank: number
  id: string
  title: string
  path?: string[]
  icon?: string
  iconColor?: string
  type?: SearchResultType
}

export type SearchResult = SearchResultBase & ({
  route: RouteLocationRaw
} | {
  onActivate: () => unknown
})

export type SandboxColorScheme = 'auto' | 'light' | 'dark'

export interface PreviewSettings {
  /**
   * Width of the responsive preview, in pixels. `null` sizes it to the
   * available space.
   *
   * @default 720
   */
  responsiveWidth: number
  /**
   * Height of the responsive preview, in pixels. `null` sizes it to the
   * available space.
   *
   * @default null
   */
  responsiveHeight: number
  /**
   * Swap `responsiveWidth` and `responsiveHeight`, to preview a size in
   * landscape without editing both values.
   *
   * @default false
   */
  rotate: boolean
  /**
   * Background color of the story preview. Any CSS color, not only the ones
   * from `backgroundPresets`.
   *
   * @default 'transparent'
   */
  backgroundColor: string
  /**
   * Whether `backgroundColor` came from an explicit toolbar pick rather than
   * from the `defaultBackgroundColor` config option.
   *
   * @default false
   */
  backgroundColorPicked: boolean
  /**
   * Show a checkerboard pattern behind the story, to spot transparency.
   *
   * @default false
   */
  checkerboard: boolean
  /**
   * `dir` attribute set on the story preview.
   *
   * @default 'ltr'
   */
  textDirection: 'ltr' | 'rtl'
  /**
   * Color scheme of the story preview, independent from the app chrome.
   *
   * @default 'auto'
   */
  colorScheme: SandboxColorScheme
}

declare module 'vue' {
  interface ComponentCustomProperties {
    __POVESTE_DEV__: boolean
  }
}

declare global {
  const __POVESTE_DEV__: boolean

  interface Window {
    __HST_PLUGIN_API__: {
      sendEvent: (event: string, payload: any) => Promise<any>
      openStory: (storyId: string) => void
    }
  }
}
