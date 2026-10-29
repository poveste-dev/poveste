import { Icon } from '@iconify/vue'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import DefaultTheme from 'vitepress/theme'
import DemoLinks from './DemoLinks.vue'
import 'floating-vue/dist/style.css'
import '@shikijs/vitepress-twoslash/style.css'
import './style/vars.pcss'
import './style/index.pcss'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // FloatingVue once, through Twoslash's installer: Vue installs a plugin a single time, so
    // a second `app.use` left the `twoslash` theme unregistered and every hover threw (#1526).
    app.use(TwoslashFloatingVue, {
      theme: {
        dropdown: {
          computeTransformOrigin: true,
        },
      },
    })
    app.component('Icon', Icon)
    app.component('DemoLinks', DemoLinks)
  },
}
