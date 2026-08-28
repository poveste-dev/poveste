import { defineSetupVue3 } from '@poveste/plugin-vue'
import { Quasar } from 'quasar'
import 'quasar/src/css/index.sass'

export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(Quasar, {})
})
