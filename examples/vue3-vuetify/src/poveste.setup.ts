import { defineSetupVue3 } from '@poveste/plugin-vue'

// Vuetify
import { createVuetify } from 'vuetify'
// Styles
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'
import './poveste.css'

export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(createVuetify())
})
