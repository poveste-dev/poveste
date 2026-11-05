import { defineSetupSvelte } from '@poveste/plugin-svelte'
import WrapperGlobal from './lib/stories/WrapperGlobal.svelte'
import './poveste.css'

export const setupSvelte = defineSetupSvelte(({ addWrapper }) => {
  addWrapper(WrapperGlobal)
})
