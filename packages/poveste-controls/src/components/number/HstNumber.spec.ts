import { mount } from '@vue/test-utils'
import HstNumber from './HstNumber.vue'

describe('hstNumber', () => {
  it('drags an empty value to a number rather than NaN', async () => {
    // A drag adds its distance to the value it started from, and a control with
    // no value started from undefined (#782).
    const wrapper = mount(HstNumber, { props: { title: 'Count' }, attachTo: document.body })

    await wrapper.trigger('mousedown', { clientX: 0 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([3])
    wrapper.unmount()
  })
})
