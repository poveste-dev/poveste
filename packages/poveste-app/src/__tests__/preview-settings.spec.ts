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

function open(stored?: Record<string, unknown>) {
  localStorage.clear()
  if (stored) {
    localStorage.setItem(PREVIEW_SETTINGS_STORAGE_KEY, JSON.stringify(stored))
  }
  setActivePinia(createPinia())
  return usePreviewSettingsStore().currentSettings
}

const STORED = { responsiveWidth: 720, responsiveHeight: null, rotate: false, backgroundColor: '#000', backgroundColorPicked: false, checkerboard: false, textDirection: 'ltr' }

beforeEach(() => {
  for (const key of Object.keys(config)) delete config[key]
  config.theme = {}
})

describe('what the preview opens at', () => {
  it('is 720 wide at automatic height on a transparent background when the book sets nothing', () => {
    const settings = open()

    expect(settings).toMatchObject({ responsiveWidth: 720, responsiveHeight: null, backgroundColor: 'transparent' })
  })

  it('is what the book\'s `preview` group says', () => {
    config.preview = { responsiveWidth: 360, responsiveHeight: 640, checkerboard: true, textDirection: 'rtl' }

    const settings = open()

    expect(settings).toMatchObject({ responsiveWidth: 360, responsiveHeight: 640, checkerboard: true, textDirection: 'rtl' })
  })

  // `useStorage` honours its default only on first run, so a reader who had
  // opened any book before would never see the group without the re-apply.
  it('reaches a reader whose stored settings predate the config', () => {
    config.preview = { responsiveWidth: 1366, responsiveHeight: null, backgroundColor: '#fff' }

    const settings = open(STORED)

    expect(settings).toMatchObject({ responsiveWidth: 1366, responsiveHeight: null, backgroundColor: '#fff' })
  })

  it('stops re-applying a setting once the reader changes it, and only that one', async () => {
    config.preview = { responsiveWidth: 360, responsiveHeight: 640, checkerboard: true }
    const settings = open()

    settings.responsiveWidth = 500
    await nextTick()
    const reopened = open({ ...settings, checkerboard: false })

    expect(reopened).toMatchObject({ responsiveWidth: 500, responsiveHeight: 640, checkerboard: true })
  })

  it('does not count its own re-apply as the reader changing anything', async () => {
    config.preview = { responsiveWidth: 360 }

    const settings = open(STORED)
    await nextTick()

    expect(settings.picked).toBeUndefined()
  })
})

describe('the deprecated `defaultBackgroundColor`', () => {
  it('is still honoured', () => {
    config.defaultBackgroundColor = '#fafafa'

    expect(open(STORED).backgroundColor).toBe('#fafafa')
  })

  it('gives way to `preview.backgroundColor` when a book sets both', () => {
    config.defaultBackgroundColor = '#fafafa'
    config.preview = { backgroundColor: '#fff' }

    expect(open(STORED).backgroundColor).toBe('#fff')
  })

  // Settings stored before `picked` carry the old flag, and a reader's pick
  // from back then has to keep winning.
  it('never overrides a background a reader picked before `picked` existed', () => {
    config.preview = { backgroundColor: '#fff' }

    expect(open({ ...STORED, backgroundColorPicked: true }).backgroundColor).toBe('#000')
  })
})
