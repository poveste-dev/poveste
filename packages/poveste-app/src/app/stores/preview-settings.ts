import type { PreviewSettings } from '../types'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { povesteConfig } from '../util/config'

export const usePreviewSettingsStore = defineStore('preview-settings', () => {
  const currentSettings = useStorage<PreviewSettings>('_poveste-sandbox-settings-v3', {
    responsiveWidth: 720,
    responsiveHeight: null,
    rotate: false,
    backgroundColor: povesteConfig.defaultBackgroundColor ?? 'transparent',
    backgroundColorPicked: false,
    checkerboard: false,
    textDirection: 'ltr',
  })

  // useStorage honors its default only on first run, so already-stored settings
  // would never see `defaultBackgroundColor` (nor a later change to it). Re-apply
  // it on every load until the user picks a color from the toolbar; the flag lives
  // in the settings object so it travels with the value it describes.
  const configBg = povesteConfig.defaultBackgroundColor
  if (configBg && !currentSettings.value.backgroundColorPicked) {
    currentSettings.value.backgroundColor = configBg
  }

  function setBackgroundColor(color: string) {
    currentSettings.value.backgroundColor = color
    currentSettings.value.backgroundColorPicked = true
  }

  return {
    currentSettings,
    setBackgroundColor,
  }
})
