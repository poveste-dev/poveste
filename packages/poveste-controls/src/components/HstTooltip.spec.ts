import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import HstTooltip from './HstTooltip.vue'

function tooltip(props: Record<string, unknown>) {
  return mount(HstTooltip, { props, slots: { default: '<button type="button">Trigger</button>' }, attachTo: document.body })
}

/** The portal lands in `document.body`, which is where a sandbox's popper goes. */
function shown() {
  return document.body.querySelector('.poveste-tooltip')?.textContent?.includes('Copied!') ?? false
}

describe('a tooltip the caller holds open', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows its content while open', async () => {
    tooltip({ content: 'Copied!', open: true })
    await nextTick()

    expect(shown()).toBe(true)
  })

  it('shows nothing while closed, without waiting for a hover to end', async () => {
    tooltip({ content: 'Copied!', open: false })
    await nextTick()

    expect(shown()).toBe(false)
  })

  it('renders no tooltip at all without content', async () => {
    const wrapper = tooltip({ open: true })
    await nextTick()

    expect(document.body.querySelector('.poveste-tooltip')).toBeNull()
    expect(wrapper.find('button').text()).toBe('Trigger')
  })
})
