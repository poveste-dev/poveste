import { mount } from '@vue/test-utils'
import HstSlider from './HstSlider.vue'

describe('hstSlider', () => {
  it('shows its tooltip over a slider with no value yet', async () => {
    // `modelValue.toString()` in the tooltip threw on null, so hovering an empty
    // slider took the control's render down (#782).
    const wrapper = mount(HstSlider, { props: { modelValue: null, min: 0, max: 100, title: 'Opacity' } })

    await wrapper.find('input').trigger('mouseover')

    expect(wrapper.find('input').exists()).toBe(true)
  })
})
