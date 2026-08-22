import { HstScreenshot } from '@poveste/plugin-screenshot'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstVue(),
    HstScreenshot(),
  ],
})
