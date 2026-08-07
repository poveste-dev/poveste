import { useDark, useToggle } from '@vueuse/core'
import { watch } from 'vue'
import { povesteConfig } from './config.js'

export const isDark = useDark({
  valueDark: 'ptw-dark',
  initialValue: povesteConfig.theme.defaultColorScheme,
  storageKey: 'poveste-color-scheme',
  storage: povesteConfig.theme.storeColorScheme ? localStorage : sessionStorage,
})
export const toggleDark = useToggle(isDark)

function applyDarkToControls() {
  window.__pvt_controls_dark?.forEach((ref) => {
    ref.value = isDark.value
  })
}

watch(isDark, () => {
  applyDarkToControls()
}, {
  immediate: true,
})

window.__pvt_controls_dark_ready = () => {
  applyDarkToControls()
}
