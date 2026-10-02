// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

// `util/config` re-exports a virtual module Vite generates from the book's own
// config, so the tests supply it directly.
const config: Record<string, any> = { theme: {} }
vi.mock('../app/util/config', () => ({
  get povesteConfig() {
    return config
  },
}))
vi.mock('../app/util/dark', () => ({ isDark: { value: false } }))

const { usePreviewSettingsStore } = await import('../app/stores/preview-settings')
const { PREVIEW_SETTINGS_STORAGE_KEY } = await import('../app/util/preview-settings')

const PRESETS = [
  { label: 'Mobile', width: 360, height: 640 },
  { label: 'Desktop', width: 1366, height: null },
]

function open(stored?: Record<string, unknown>) {
  localStorage.clear()
  if (stored) {
    localStorage.setItem(PREVIEW_SETTINGS_STORAGE_KEY, JSON.stringify(stored))
  }
  setActivePinia(createPinia())
  return usePreviewSettingsStore().currentSettings
}

beforeEach(() => {
  for (const key of Object.keys(config)) delete config[key]
  config.theme = {}
  config.responsivePresets = PRESETS
})

describe('the size a story opens at', () => {
  it('is 720 wide at automatic height when the book names no preset', () => {
    const settings = open()

    expect([settings.responsiveWidth, settings.responsiveHeight]).toEqual([720, null])
  })

  it('is the preset the book names', () => {
    config.defaultResponsivePreset = 'Mobile'

    const settings = open()

    expect([settings.responsiveWidth, settings.responsiveHeight]).toEqual([360, 640])
  })

  // `useStorage` honours its default only on first run, so a reader who had
  // opened any book before would never see the key without the re-apply.
  it('reaches a reader whose stored size predates the key', () => {
    config.defaultResponsivePreset = 'Desktop'

    const settings = open({ responsiveWidth: 720, responsiveHeight: null })

    expect([settings.responsiveWidth, settings.responsiveHeight]).toEqual([1366, null])
  })

  it('stops being re-applied once the reader changes the size', async () => {
    config.defaultResponsivePreset = 'Mobile'
    const settings = open()

    settings.responsiveWidth = 500
    await nextTick()

    expect(settings.responsiveSizePicked).toBe(true)
    const reopened = open({ ...settings })
    expect(reopened.responsiveWidth).toBe(500)
  })

  it('does not count its own apply as the reader picking', async () => {
    config.defaultResponsivePreset = 'Mobile'

    const settings = open()
    await nextTick()

    expect(settings.responsiveSizePicked).toBeUndefined()
  })
})
