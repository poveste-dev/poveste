// @vitest-environment jsdom
import { createApp, h, nextTick, reactive } from '@poveste/vendors/vue'
import { beforeEach, describe, expect, it } from 'vitest'
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

function open(Root: any, props: Record<string, unknown>) {
  const app = createApp({ render: () => h(Root, props) })
  app.mount(document.createElement('div'))
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
