import { mount } from '@vue/test-utils'
import HstText from './HstText.vue'

describe('hstText', () => {
  it('writes what was typed back', async () => {
    const wrapper = mount(HstText, { props: { title: 'Label', modelValue: 'Hello' } })

    const input = wrapper.get('input')
    input.element.value = 'Foo'
    await input.trigger('input')

    expect(wrapper.emitted('update:modelValue')).toEqual([['Foo']])
  })

  it('puts a passed-through attribute on the input only', () => {
    // Without `inheritAttrs: false` the attribute lands twice: once on the
    // wrapper, which is this component's root, and once through the explicit
    // `v-bind` on the input. `HstTextarea` has always had the flag; this one
    // did not, so `id` rendered a duplicate id and `disabled` a wrapper that
    // claimed to be disabled.
    const wrapper = mount(HstText, {
      props: { title: 'Label', modelValue: 'Hello' },
      attrs: { id: 'label-field' },
    })

    expect(wrapper.findAll('#label-field')).toHaveLength(1)
    expect(wrapper.get('#label-field').element.tagName).toBe('INPUT')
  })
})
