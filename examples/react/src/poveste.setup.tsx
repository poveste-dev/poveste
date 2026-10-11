import { defineSetupReact } from '@poveste/plugin-react'

// Every story renders inside this frame: the setup hook runs before the story
// mounts, so the wrapper is there for the first render.
export const setupReact = defineSetupReact(({ addWrapper }) => {
  addWrapper(({ children }) => <div className="story-frame" data-testid="story-frame">{children}</div>)
})
