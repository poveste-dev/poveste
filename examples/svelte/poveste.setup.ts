import { defineSetupSvelte } from '@poveste/plugin-svelte'
import WrapperGlobal from './src/stories/WrapperGlobal.svelte'
import './src/poveste.css'

declare module 'poveste' {
  interface CommonMeta {
    /** Set to `false` to turn off `WrapperGlobal`'s styling. */
    wrapper?: boolean
  }
}

// As the guide writes it. This import alone failed every story's collection, and
// then loaded the plugin's Node entry in the page (#1301).
export const setupSvelte = defineSetupSvelte(({ setContext, addWrapper }) => {
  setContext('from-setup-file', 'set by the setup file')
  addWrapper(WrapperGlobal)
})
