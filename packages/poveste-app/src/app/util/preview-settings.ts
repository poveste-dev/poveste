import type { PreviewSettings } from '../types'
import { reactive } from 'vue'
import { povesteConfig } from './config'

export const PREVIEW_SETTINGS_STORAGE_KEY = '_poveste-sandbox-settings-v3'

export const receivedSettings = reactive<PreviewSettings>({} as PreviewSettings)

/**
 * Read the settings the app persists, for sandboxes that can't wait for (or
 * will never get) a `PREVIEW_SETTINGS_SYNC` message.
 */
export function loadStoredPreviewSettings(): PreviewSettings | null {
  try {
    const raw = localStorage.getItem(PREVIEW_SETTINGS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  }
  catch {
    return null
  }
}

export function applyPreviewSettings(settings: PreviewSettings) {
  Object.assign(receivedSettings, settings)

  // Text direction
  document.documentElement.setAttribute('dir', settings.textDirection)

  // Contrast color
  const contrastColor = getContrastColor(settings)
  document.documentElement.style.setProperty('--poveste-contrast-color', contrastColor)
  // Deprecated alias — keep so stories that reference `var(--histoire-contrast-color)` still work.
  document.documentElement.style.setProperty('--histoire-contrast-color', contrastColor)
  if (povesteConfig.autoApplyContrastColor) {
    document.documentElement.style.color = contrastColor
  }
}

export function getContrastColor(setting: PreviewSettings) {
  return povesteConfig.backgroundPresets.find(preset => preset.color === setting.backgroundColor)?.contrastColor ?? 'unset'
}
