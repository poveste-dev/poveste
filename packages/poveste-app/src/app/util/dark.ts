import { useDark, useToggle } from '@vueuse/core'
import { watch } from 'vue'
import { povesteConfig } from './config.js'

// A sandboxed story's realm reads the chrome's setting but shows the story preview's
// dark, which `sandbox.ts` puts on its `<html>` for the controls; applying this one
// there too would fight it (#1443).
const inSandbox = location.href.includes('__sandbox')

export const isDark = useDark({
  valueDark: 'ptw-dark',
  ...povesteConfig.theme.defaultColorScheme ? { initialValue: povesteConfig.theme.defaultColorScheme } : {},
  storageKey: 'poveste-color-scheme',
  storage: povesteConfig.theme.storeColorScheme ? localStorage : sessionStorage,
  ...inSandbox ? { onChanged: () => {} } : {},
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
