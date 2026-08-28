import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue3 } from '@poveste/plugin-vue'
import greeting from './boot/greeting'

export const setupVue3 = defineSetupVue3(setupQuasar({
  // Your app's boot files. They do not run otherwise — see below.
  boot: [greeting],
}))
