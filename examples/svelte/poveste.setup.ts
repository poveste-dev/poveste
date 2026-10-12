import { defineSetupSvelte } from '@poveste/plugin-svelte'
import './src/poveste.css'

// As the guide writes it. This import alone failed every story's collection (#1301).
export const setupSvelte = defineSetupSvelte(() => {})
