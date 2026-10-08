import type { PreviewSettings, SandboxColorScheme } from '../types'
import { usePreferredDark } from '@vueuse/core'
import { computed } from 'vue'
import { povesteConfig } from './config'
import { isDark } from './dark'

/**
 * Color scheme the story preview starts on, before the user picks one in the
 * toolbar. Shared with the app chrome so a book configured as dark starts dark
 * on both sides.
 */
export const defaultPreviewColorScheme: SandboxColorScheme = povesteConfig.theme.defaultColorScheme ?? 'auto'

/**
 * The story preview has its own color scheme, independent from the app chrome.
 * `chromeDark` only covers settings that predate the option (and the sandbox
 * boot window), where we keep the old behavior of following the chrome.
 */
export function resolvePreviewDark(colorScheme: SandboxColorScheme | undefined, prefersDark: boolean, chromeDark: boolean) {
  switch (colorScheme) {
    case 'light': return false
    case 'dark': return true
    case 'auto': return prefersDark
    default: return chromeDark
  }
}

/**
 * The CSS `color-scheme` a preview declares, from the same inputs as the class.
 *
 * The class tells the book's CSS; this tells the browser, which paints native
 * widgets, scrollbars and the canvas itself and reads no class (#991). `auto`
 * becomes `light dark`, so the browser follows the OS preference on its own
 * rather than being told the answer `prefersDark` already computed.
 */
export function previewColorScheme(colorScheme: SandboxColorScheme | undefined, chromeDark: boolean): 'light' | 'dark' | 'light dark' {
  switch (colorScheme) {
    case 'light': return 'light'
    case 'dark': return 'dark'
    case 'auto': return 'light dark'
    default: return chromeDark ? 'dark' : 'light'
  }
}

/**
 * Declares `color-scheme` on `selector` beneath any rule a book writes: in the
 * first cascade layer of the document, at zero specificity. Set inline, it beat
 * a book's own `:root { color-scheme }` on every render path (#1167).
 */
export function lowPriorityColorScheme(selector: string) {
  const style = document.createElement('style')
  document.head.prepend(style)
  return (value: string) => {
    style.textContent = `@layer poveste-color-scheme { :where(${selector}) { color-scheme: ${value}; } }`
  }
}

/**
 * Previews the app renders itself carry their scheme as a custom property, which
 * this applies to their root at the same low priority. Style isolation moves a
 * book's own `:root` rule onto that root, so it wins.
 */
export function installRenderRootColorScheme() {
  lowPriorityColorScheme('.__poveste-render-story')('var(--poveste-color-scheme)')
}

/** `previewColorScheme`, for previews rendered by the app itself. */
export function usePreviewColorScheme(settings: PreviewSettings) {
  return computed(() => previewColorScheme(settings.colorScheme, isDark.value))
}

/**
 * Whether the story preview should be rendered dark, for previews rendered by
 * the app itself. The sandbox resolves the same thing from the settings it
 * receives over `PREVIEW_SETTINGS_SYNC`.
 */
export function usePreviewDark(settings: PreviewSettings) {
  const prefersDark = usePreferredDark()
  return computed(() => resolvePreviewDark(settings.colorScheme, prefersDark.value, isDark.value))
}

/**
 * Classes the story root carries in dark mode, identical on all three render
 * paths. The deprecated `sandboxDarkClass` is emitted only when a book sets it
 * (#126).
 */
export function previewDarkClasses(): string[] {
  const { darkClass } = povesteConfig.theme
  // eslint-disable-next-line ts/no-deprecated
  const legacy = povesteConfig.sandboxDarkClass
  // Empty entries are dropped: `classList.toggle('')` throws, during boot.
  return [...new Set([darkClass, legacy])].filter((name): name is string => !!name)
}
