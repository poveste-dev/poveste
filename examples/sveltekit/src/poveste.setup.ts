import { defineSetupSvelte } from '@poveste/plugin-svelte'
import WrapperGlobal from './lib/stories/WrapperGlobal.svelte'
import './poveste.css'

declare module 'poveste' {
  interface CommonMeta {
    /** Set to `false` to turn off `WrapperGlobal`'s styling. */
    wrapper?: boolean
  }
}

export const setupSvelte = defineSetupSvelte(({ addWrapper }) => {
  addWrapper(WrapperGlobal)
})
