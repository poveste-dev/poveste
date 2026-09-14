import { describe, expect, it } from 'vitest'
import { createRenderTracker } from '../app/util/render-tracker.js'

describe('createRenderTracker', () => {
  it('calls a render clean when nothing was reported during it', () => {
    const render = createRenderTracker()

    render.begin()

    expect(render.wasClean()).toBe(true)
  })

  it('does not call a render clean when a throw was reported during it', () => {
    const render = createRenderTracker()
    render.begin()

    render.threw()

    expect(render.wasClean()).toBe(false)
  })

  // The half #597 is about. Without it a story that threw once stays marked for
  // the life of the tab: every later render inherits the first one's verdict,
  // so the marker the old comment promised to lift on a fix never lifts.
  it('forgets the previous render when a new one begins', () => {
    const render = createRenderTracker()
    render.begin()
    render.threw()

    render.begin()

    expect(render.wasClean()).toBe(true)
  })

  it('treats a render that has reported nothing yet as clean', () => {
    expect(createRenderTracker().wasClean()).toBe(true)
  })
})
