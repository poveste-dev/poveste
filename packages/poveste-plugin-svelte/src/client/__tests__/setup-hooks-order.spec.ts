// @vitest-environment jsdom
import { createApp, h, nextTick, reactive } from '@poveste/vendors/vue'
import { beforeEach, describe, expect, it } from 'vitest'
import InnerWrapper from '../../../fixtures/setup-hooks/InnerWrapper.svelte'
import OuterWrapper from '../../../fixtures/setup-hooks/OuterWrapper.svelte'
import { hook } from '../../../fixtures/setup-hooks/setup-hook-fixture.js'
import { order } from '../../../fixtures/setup-hooks/setup-probe-order.js'
import SetupProbe from '../../../fixtures/setup-hooks/SetupProbe.svelte'
import MountStory from '../mount.js'
import RenderStory from '../render.js'

async function settle() {
  for (let i = 0; i < 6; i++) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve))
  }
}

const story = () => ({ id: 'story', title: 'Story', file: { component: SetupProbe }, variants: [] })

let root: HTMLElement

function open(Root: any, props: Record<string, unknown>) {
  const app = createApp({ render: () => h(Root, props) })
  root = document.createElement('div')
  app.mount(root)
  return app
}

describe.each([
  ['the mount pass', MountStory, () => ({ story: story() })],
  ['the render pass', RenderStory, () => ({ story: story(), variant: { id: 'variant', state: {}, configReady: true }, slotName: 'default' })],
])('setup hooks in %s', (_name, Root, props) => {
  beforeEach(() => {
    order.length = 0
    hook.current = undefined
  })

  it('run before the story mounts', async () => {
    hook.current = () => {
      order.push('hook')
    }

    const app = open(Root, props())
    await settle()

    expect(order).toEqual(['hook', 'mounted with undefined'])
    app.unmount()
  })

  it('put values in the context the story mounts with', async () => {
    hook.current = ({ setContext }) => {
      setContext('from-hook', 'a value')
    }

    const app = open(Root, props())
    await settle()

    expect(order).toEqual(['mounted with a value'])
    app.unmount()
  })

  it('leave the story unmounted when it was closed while they awaited', async () => {
    let finish!: () => void
    hook.current = () => new Promise<void>((resolve) => {
      finish = resolve
    })

    const app = open(Root, props())
    await settle()
    app.unmount()
    finish()
    await settle()

    expect(order).toEqual([])
  })
})

describe('the render pass', () => {
  beforeEach(() => {
    order.length = 0
    hook.current = undefined
  })

  // The mount pass is what reads `setupApp` off the story, so a hook run before that
  // has nothing to call.
  it('waits for the variant\'s config, which carries its `setupApp`', async () => {
    const variant = reactive<Record<string, any>>({ id: 'variant', state: {}, configReady: false })
    const app = open(RenderStory, { story: story(), variant, slotName: 'default' })
    await settle()
    expect(order).toEqual([])

    variant['setupApp'] = () => {
      order.push('setupApp')
    }
    variant['configReady'] = true
    await settle()

    expect(order).toEqual(['setupApp', 'mounted with undefined'])
    app.unmount()
  })
})

describe('`addWrapper`', () => {
  beforeEach(() => {
    order.length = 0
    hook.current = ({ addWrapper }) => {
      addWrapper(OuterWrapper)
      addWrapper(InnerWrapper)
    }
  })

  it('renders around the story, the first one added outermost', async () => {
    const app = open(RenderStory, { story: story(), variant: { id: 'variant', state: {}, configReady: true }, slotName: 'default' })
    await settle()

    expect(root.querySelector('[data-wrapper="outer"] [data-wrapper="inner"] [data-story]')).not.toBeNull()
    app.unmount()
  })

  it('lets a wrapper set context for the story', async () => {
    const app = open(RenderStory, { story: story(), variant: { id: 'variant', state: {}, configReady: true }, slotName: 'default' })
    await settle()

    expect(root.querySelector('[data-story]')?.textContent).toBe('wrapped story')
    app.unmount()
  })

  it('keeps the context a setup hook set', async () => {
    const add = hook.current!
    hook.current = (api) => {
      add(api)
      api.setContext('from-hook', 'a value')
    }

    const app = open(RenderStory, { story: story(), variant: { id: 'variant', state: {}, configReady: true }, slotName: 'default' })
    await settle()

    expect(order).toEqual(['mounted with a value'])
    app.unmount()
  })

  it('stays out of the mount pass, which nobody sees', async () => {
    const app = open(MountStory, { story: story() })
    await settle()

    expect(root.querySelector('[data-wrapper]')).toBeNull()
    app.unmount()
  })
})
