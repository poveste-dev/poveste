import { mount } from '@vue/test-utils'
import HstRadio from './HstRadio.vue'

/*
 * The pattern, not the primitive's reputation (#955). Every assertion here
 * fails against the hand-rolled version this replaced.
 */

const options = ['a', 'b', 'c']

describe('hstRadio', () => {
  it('is one radio group, not one group per option', () => {
    const wrapper = mount(HstRadio, { props: { modelValue: 'a', options, title: 'Letters' } })

    // The hand-rolled version gave every input a `name` containing its own
    // value, so no two options were ever in the same group: nothing excluded
    // anything, and the arrow keys a radio group owes a reader did nothing.
    expect(wrapper.findAll('[role="radiogroup"]')).toHaveLength(1)
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(3)
  })

  it('gives every option a real button, so space reaches it', () => {
    const wrapper = mount(HstRadio, { props: { modelValue: 'a', options, title: 'Letters' } })
    const first = wrapper.findAll('[role="radio"]')[0]

    // A non-button root has no keyboard at all, and a label forwards a click
    // only to a labelable element — two of #969's three regressions.
    expect(first.element.tagName).toBe('BUTTON')
    expect(first.attributes('type')).toBe('button')
  })

  it('exposes each option\'s state to a screen reader and to CSS', () => {
    const wrapper = mount(HstRadio, { props: { modelValue: 'b', options, title: 'Letters' } })
    const boxes = wrapper.findAll('[role="radio"]')

    expect(boxes.map(b => b.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(boxes.map(b => b.attributes('data-state'))).toEqual(['unchecked', 'checked', 'unchecked'])
  })

  it('does not nest a label inside a label', () => {
    const wrapper = mount(HstRadio, { props: { modelValue: 'a', options, title: 'Letters' } })

    expect(wrapper.element.tagName).not.toBe('LABEL')
    for (const label of wrapper.findAll('label')) {
      expect(label.findAll('label')).toHaveLength(0)
    }
  })

  it('selects an option when its box is clicked', async () => {
    const wrapper = mount(HstRadio, { props: { modelValue: 'a', options, title: 'Letters' } })
    await wrapper.findAll('[role="radio"]')[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['c'])
  })

  // Not a guard the control carries, but a default it depends on. The button
  // group and the select both had to drop an `undefined`, because
  // `ToggleGroupRoot` and `ListboxRoot` toggle by default and a second click
  // clears them. `RadioGroupRoot` assigns instead. If that ever changes, this
  // is what says so rather than a story prop quietly disappearing.
  it('keeps the held option when it is clicked again', async () => {
    const wrapper = mount(HstRadio, { props: { modelValue: 'b', options, title: 'Letters' } })
    await wrapper.findAll('[role="radio"]')[1].trigger('click')

    for (const emitted of wrapper.emitted('update:modelValue') ?? []) {
      expect(emitted).toEqual(['b'])
    }
  })

  // The whole row was clickable before too, by a native `label`/`for` pair, so
  // this is behaviour to keep rather than to add. It is not written as a parity
  // assertion because jsdom does not fire `change` for a label activating a
  // radio, so it fails against the old markup for a reason that is the
  // harness's rather than the control's.
  it('selects an option from its text, not only from its box', async () => {
    const wrapper = mount(HstRadio, { props: { modelValue: 'a', options, title: 'Letters' } })
    await wrapper.findAll('label').at(-1)!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['c'])
  })
})
