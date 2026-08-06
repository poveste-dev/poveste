/// <reference types="vite/client" />

import type { Ref } from '@poveste/vendors/vue'

global {
  interface Window {
    __pvt_controls_dark: Ref<boolean>[]
    __pvt_controls_dark_ready: () => void
  }
}
