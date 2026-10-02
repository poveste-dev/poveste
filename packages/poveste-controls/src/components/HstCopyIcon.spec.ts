import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import HstCopyIcon from './HstCopyIcon.vue'

/**
 * A clipboard with no granted permission sends `useClipboard` down its
 * `execCommand('copy')` path, which is the one that can be observed here.
 */
function stubCopy() {
  Object.defineProperty(navigator, 'clipboard', { value: {}, configurable: true })
  const execCommand = vi.fn(() => true)
  Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })
  return execCommand
}

function tooltipText() {
  return document.body.querySelector('[role="tooltip"]')?.textContent
}

const mounted: VueWrapper[] = []

async function click(content: unknown) {
  const wrapper = mount(HstCopyIcon, { props: { content } as any, attachTo: document.body })
  mounted.push(wrapper)
  await wrapper.get('button').trigger('click')
  await new Promise(resolve => setTimeout(resolve))
  await nextTick()
}

describe('hstCopyIcon', () => {
  // Unmounted before the body goes: the component's two timers, the copied flag
  // and the "Nothing to copy" reset, are stopped with its scope. Left running,
  // they fired into a removed parent while a later file ran (#1149).
  afterEach(() => {
    for (const wrapper of mounted.splice(0)) {
      wrapper.unmount()
    }
    document.body.innerHTML = ''
  })

  it('copies what its content resolves to', async () => {
    const execCommand = stubCopy()

    await click(async () => '<Button />')

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(tooltipText()).toBe('Copied!')
  })

  it('copies nothing and says so when its content resolves to nothing', async () => {
    const execCommand = stubCopy()

    await click(async () => undefined)

    expect(execCommand).not.toHaveBeenCalled()
    expect(tooltipText()).toBe('Nothing to copy')
  })
})
