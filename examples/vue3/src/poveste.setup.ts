import { defineSetupVue } from '@poveste/plugin-vue'
import { createPinia } from 'pinia'
import GlobalComp from './components/GlobalComp.vue'
import WrapperGlobal from './components/WrapperGlobal.vue'
import './poveste.css'

declare module 'poveste' {
  // Extend the story `meta` prop
  interface CommonMeta {
    /**
     * Set to `false` to disable the `WrapperGlobal` component styling.
     */
    wrapper?: boolean
  }
}

export const setupVue = defineSetupVue(({ app, addWrapper }) => {
  app.provide('demo', 42)
  const pinia = createPinia()
  app.use(pinia)

  app.component('GlobalComp', GlobalComp)

  app.directive('dashed-border', {
    beforeMount: (el, { value }) => {
      el.style.border = `1px dashed ${value}`
    },
  })

  addWrapper(WrapperGlobal)
})
