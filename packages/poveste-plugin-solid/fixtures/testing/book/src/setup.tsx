import { defineSetupSolid } from '@poveste/plugin-solid'

// A story reads this to tell that the setup file ran before it rendered.
export const setupSolid = defineSetupSolid(({ addWrapper }) => {
  ;(globalThis as { setupRan?: boolean }).setupRan = true
  addWrapper(props => <div data-frame>{props.children}</div>)
})
