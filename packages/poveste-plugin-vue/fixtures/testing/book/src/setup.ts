import { defineSetupVue3 } from '@poveste/plugin-vue'
import FromSetup from './FromSetup.vue'

export const setupVue3 = defineSetupVue3(({ app }) => {
  app.component('FromSetup', FromSetup)
})
