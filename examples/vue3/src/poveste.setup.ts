import { defineSetupVue } from '@poveste/plugin-vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
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

  // Plain vue-i18n: no seam, unlike the Nuxt example (#65). Install it on the
  // story app and `useI18n`/`$t` work; messages live with the setup.
  app.use(createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      en: { greeting: 'Hello', items: 'no items | one item | {count} items' },
      fr: { greeting: 'Bonjour', items: 'aucun article | un article | {count} articles' },
    },
  }))

  app.component('GlobalComp', GlobalComp)

  app.directive('dashed-border', {
    beforeMount: (el, { value }) => {
      el.style.border = `1px dashed ${value}`
    },
  })

  addWrapper(WrapperGlobal)
})
