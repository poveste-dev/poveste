// Deliberately on the legacy `setupVue3` / `defineSetupVue3` spelling, while
// `examples/vue3` uses the unnumbered pair. We promise the numbered names keep
// working for all of 0.x, and a promise nothing runs is not a promise — this is
// a required CI job, so the legacy path stays proven (#135).
import { defineSetupVue3 } from '@poveste/plugin-vue'
import './poveste.css'

export const setupVue3 = defineSetupVue3(() => {})
