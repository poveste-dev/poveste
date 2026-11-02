import { defineSetupSvelte } from '@poveste/plugin-svelte'

// A story reads this to tell that the setup file ran before it rendered.
export const setupSvelte = defineSetupSvelte(() => {
  ;(globalThis as { setupRan?: boolean }).setupRan = true
})
