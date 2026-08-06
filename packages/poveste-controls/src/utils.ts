import { ref } from 'vue'

export const isDark = ref(false)

if (!window.__pvt_controls_dark) {
  window.__pvt_controls_dark = []
}

// There could be multiple instances of the controls lib (in the controls book https://controls.poveste.dev)
window.__pvt_controls_dark.push(isDark)

window.__pvt_controls_dark_ready?.()
