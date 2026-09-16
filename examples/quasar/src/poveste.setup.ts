import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue } from '@poveste/plugin-vue'
import greeting from './boot/greeting' // one of your own, from src/boot

export const setupVue = defineSetupVue(setupQuasar({
  // Your app's boot files. They do not run otherwise — see below.
  boot: [greeting],
}))
