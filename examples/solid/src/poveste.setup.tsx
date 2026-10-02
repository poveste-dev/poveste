import { defineSetupSolid } from '@poveste/plugin-solid'

// Every story renders inside this frame: the setup hook runs before the story
// mounts, so the wrapper is there for the first render.
export const setupSolid = defineSetupSolid(({ addWrapper }) => {
  addWrapper(props => <div class="story-frame" data-testid="story-frame">{props.children}</div>)
})
