import { HstPercy } from '@poveste/plugin-percy'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
    HstPercy(),
  ],
})
