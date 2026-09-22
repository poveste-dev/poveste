import { mount } from '@vue/test-utils'
import HstCheckbox from './HstCheckbox.vue'
import HstCheckboxList from './HstCheckboxList.vue'
import HstSimpleCheckbox from './HstSimpleCheckbox.vue'

/*
 * The pattern, not the primitive's reputation (#955). Every assertion here
 * failed against the hand-rolled version these replaced, except the two marked
 * as parity — those passed before and must keep passing.
 */

describe('hstCheckbox', () => {
  it('is a real button, so focus does not depend on a tabindex', () => {
    const wrapper = mount(HstCheckbox, { props: { modelValue: false, title: 'Enabled' } })
    const box = wrapper.get('[role="checkbox"]')

    expect(box.element.tagName).toBe('BUTTON')
    // A submit button inside a form would submit it.
    expect(box.attributes('type')).toBe('button')
    expect(box.attributes('tabindex')).toBeUndefined()
  })

  it('exposes its state to a screen reader and to CSS', async () => {
    const wrapper = mount(HstCheckbox, { props: { modelValue: false, title: 'Enabled' } })

    expect(wrapper.get('[role="checkbox"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.get('[role="checkbox"]').attributes('data-state')).toBe('unchecked')

    await wrapper.setProps({ modelValue: true })

    expect(wrapper.get('[role="checkbox"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[role="checkbox"]').attributes('data-state')).toBe('checked')
  })

  it('wraps exactly one control in its label, which is what makes the title clickable', () => {
    const wrapper = mount(HstCheckbox, { props: { modelValue: false, title: 'Enabled' } })

    expect(wrapper.element.tagName).toBe('LABEL')
    // #928: a label over several controls sends the click to whichever one it
    // resolves to, not the one under the pointer. One control is the safe case.
    expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(1)
    // Queried from the root element, so the root label itself is not counted.
    expect(wrapper.element.querySelectorAll('label')).toHaveLength(0)
  })

  // Parity: both of these passed before and are the reason the control exists.
  it('toggles from the whole row, not just the box', async () => {
    const wrapper = mount(HstCheckbox, { props: { modelValue: false, title: 'Enabled' } })
    await wrapper.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('keeps a string model a string, both ways', async () => {
    const wrapper = mount(HstCheckbox, { props: { modelValue: 'false' as const, title: 'Enabled' } })
    await wrapper.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['true'])
  })
})

describe('hstCheckboxList', () => {
  const options = ['a', 'b', 'c']

  it('does not nest a label inside a label', () => {
    const wrapper = mount(HstCheckboxList, { props: { modelValue: [], options, title: 'Letters' } })

    // The wrapper was a `label` with `role="group"` holding one `label` per
    // option — invalid, and #928's trap over three controls at once.
    expect(wrapper.element.tagName).not.toBe('LABEL')
    for (const label of wrapper.findAll('label')) {
      expect(label.findAll('label')).toHaveLength(0)
    }
  })

  it('gives every option a checkbox role and its own state', async () => {
    const wrapper = mount(HstCheckboxList, { props: { modelValue: ['b'], options, title: 'Letters' } })
    const boxes = wrapper.findAll('[role="checkbox"]')

    expect(boxes).toHaveLength(3)
    expect(boxes.map(b => b.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
  })

  it('writes the option back when one is picked', async () => {
    const wrapper = mount(HstCheckboxList, { props: { modelValue: [], options, title: 'Letters' } })
    await wrapper.findAll('[role="checkbox"]')[0].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['a']])
  })
})

describe('hstSimpleCheckbox', () => {
  it('owns the checkbox role only when it is the control', () => {
    const decoration = mount(HstSimpleCheckbox, { props: { modelValue: true } })
    const control = mount(HstSimpleCheckbox, { props: { modelValue: true, withToggle: true } })

    // Inside another root, a second role would announce two checkboxes for one.
    expect(decoration.find('[role="checkbox"]').exists()).toBe(false)
    expect(control.find('[role="checkbox"]').exists()).toBe(true)
  })

  it('toggles when it is the control', async () => {
    const wrapper = mount(HstSimpleCheckbox, { props: { modelValue: false, withToggle: true } })
    await wrapper.get('[role="checkbox"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })
})
