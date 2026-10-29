import { defineSetupReact } from '@poveste/plugin-react'

// A story reads this to tell that the setup file ran before it rendered.
export const setupReact = defineSetupReact(({ addWrapper }) => {
  ;(globalThis as { setupRan?: boolean }).setupRan = true
  addWrapper(({ children }) => <div data-frame>{children}</div>)
})
