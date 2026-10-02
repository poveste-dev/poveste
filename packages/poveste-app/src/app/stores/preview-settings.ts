import type { PreviewSettings } from '../types'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { defaultPreviewColorScheme } from '../util/color-scheme'
import { povesteConfig } from '../util/config'
import { PREVIEW_SETTINGS_STORAGE_KEY } from '../util/preview-settings'

// What a book can open the preview at, as groups of settings that change
// together: a preset or a drag sets the width and height at once.
const UNITS: (keyof PreviewSettings)[][] = [
  ['responsiveWidth', 'responsiveHeight'],
  ['backgroundColor'],
  ['rotate'],
  ['checkerboard'],
  ['textDirection'],
]

/** The book's `preview` config, with the deprecated `defaultBackgroundColor` under it. */
function configured(): Partial<PreviewSettings> {
  // eslint-disable-next-line ts/no-deprecated
  const legacy = povesteConfig.defaultBackgroundColor
  return { ...(legacy === undefined ? {} : { backgroundColor: legacy }), ...povesteConfig.preview }
}

export const usePreviewSettingsStore = defineStore('preview-settings', () => {
  const book = configured()
  const currentSettings = useStorage<PreviewSettings>(PREVIEW_SETTINGS_STORAGE_KEY, {
    responsiveWidth: 720,
    responsiveHeight: null,
    rotate: false,
    backgroundColor: 'transparent',
    backgroundColorPicked: false,
    checkerboard: false,
    textDirection: 'ltr',
    colorScheme: defaultPreviewColorScheme,
    ...book,
  })

  // useStorage honours its default only on first run, so a reader with stored
  // settings would never see the book's values, nor a later change to them.
  // Re-applied on every load, per unit, until the reader changes that unit. A
  // stored `backgroundColorPicked` predates `picked` and counts as picking.
  const picked = new Set(currentSettings.value.picked ?? [])
  if (currentSettings.value.backgroundColorPicked) {
    picked.add('backgroundColor')
  }
  for (const unit of UNITS) {
    if (picked.has(unit[0]!)) {
      continue
    }
    for (const key of unit) {
      if (book[key] !== undefined) {
        Object.assign(currentSettings.value, { [key]: book[key] })
      }
    }
  }

  // Set up after the re-apply, so only the reader's own changes count: the
  // toolbar, the size inputs and the drag handles all write these settings.
  for (const unit of UNITS) {
    watch(() => unit.map(key => currentSettings.value[key]), () => {
      currentSettings.value.picked = [...new Set([...(currentSettings.value.picked ?? []), unit[0]!])]
    })
  }

  // Settings stored before `colorScheme` existed would leave it undefined, so
  // the toolbar would show no active option.
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
