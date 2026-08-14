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
 * paths — grid, inline single preview, and sandbox iframe.
 *
 * `sandboxDarkClass` is deprecated in favour of `theme.darkClass` and is only
 * emitted when a consumer set it, so a book on defaults gets one class rather
 * than the same class twice (#126).
 */
export function previewDarkClasses(): string[] {
  const { darkClass } = povesteConfig.theme
  // eslint-disable-next-line ts/no-deprecated
  const legacy = povesteConfig.sandboxDarkClass
  return legacy && legacy !== darkClass ? [darkClass, legacy] : [darkClass]
}
