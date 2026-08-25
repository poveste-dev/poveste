import { defineSetupVue } from '@poveste/plugin-vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import GlobalComp from './components/stories/GlobalComp.vue'
import WrapperGlobal from './components/stories/WrapperGlobal.vue'
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

  // @nuxtjs/i18n's own client plugin can't run in the story sandbox (#65), so a
  // story's i18n is installed here instead. Messages live with the story rather
  // than the app's locale files, which stories don't load.
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
