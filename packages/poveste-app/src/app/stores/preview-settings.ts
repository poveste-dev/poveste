import type { PreviewSettings } from '../types'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { defaultPreviewColorScheme } from '../util/color-scheme'
import { povesteConfig } from '../util/config'
import { PREVIEW_SETTINGS_STORAGE_KEY } from '../util/preview-settings'

export const usePreviewSettingsStore = defineStore('preview-settings', () => {
  const currentSettings = useStorage<PreviewSettings>(PREVIEW_SETTINGS_STORAGE_KEY, {
    responsiveWidth: 720,
    responsiveHeight: null,
    rotate: false,
    backgroundColor: povesteConfig.defaultBackgroundColor ?? 'transparent',
    backgroundColorPicked: false,
    checkerboard: false,
    textDirection: 'ltr',
    colorScheme: defaultPreviewColorScheme,
  })

  // useStorage honors its default only on first run, so already-stored settings
  // would never see `defaultBackgroundColor` (nor a later change to it). Re-apply
  // it on every load until the user picks a color from the toolbar; the flag lives
  // in the settings object so it travels with the value it describes.
  const configBg = povesteConfig.defaultBackgroundColor
  if (configBg && !currentSettings.value.backgroundColorPicked) {
    currentSettings.value.backgroundColor = configBg
  }

  // Same reason: settings stored before `colorScheme` existed would leave it
  // undefined, so the toolbar would show no active option.
  currentSettings.value.colorScheme ??= defaultPreviewColorScheme

  function setBackgroundColor(color: string) {
    currentSettings.value.backgroundColor = color
    currentSettings.value.backgroundColorPicked = true
  }

  return {
    currentSettings,
    setBackgroundColor,
  }
})
