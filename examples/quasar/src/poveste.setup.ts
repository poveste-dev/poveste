import { defineSetupVue3 } from '@poveste/plugin-vue'
import { Quasar } from 'quasar'
import greeting from './boot/greeting'
import 'quasar/src/css/index.sass'

export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(Quasar, {})
  // Your app's boot files go here — they do not run otherwise. Drop this line
  // and its import if you have none; see below for why they matter.
  greeting({ app })
})
