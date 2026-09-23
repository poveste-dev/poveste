import { mount } from '@vue/test-utils'
import HstButtonGroup from './HstButtonGroup.vue'

// `HstButtonGroup` and the `HstButton` it is the only caller of are reached by
// no example book, no `@poveste/app` code and no e2e spec (#971), so a change to
// either is green by construction. These are the assertions the migration onto
// `ToggleGroupRoot` would otherwise have had none of.

function group(props: Record<string, unknown> = {}) {
  return mount(HstButtonGroup, {
    props: { title: 'Size', options: ['sm', 'md', 'lg'], modelValue: 'md', ...props },
  })
}

describe('hstButtonGroup', () => {
  it('emits the value of the option that was clicked', async () => {
    const wrapper = group()

    await wrapper.findAll('button')[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['lg']])
  })

  it('emits nothing when the option already held is clicked', async () => {
    // `ToggleGroupRoot` in single mode deselects on a second click: it emits
    // `undefined` for the value it already holds. A story prop has no empty
    // position, so the group drops it rather than writing the prop away.
    const wrapper = group()

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('renders each option as a native button, so it has a keyboard at all', () => {
    const buttons = group().findAll('button')

    expect(buttons).toHaveLength(3)
    expect(buttons.map(button => button.attributes('type'))).toEqual(['button', 'button', 'button'])
  })

  it('marks the held option pressed, and only that one', () => {
    const buttons = group().findAll('button')

    expect(buttons.map(button => button.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
  })

  it('groups the options rather than the options plus their title', () => {
    const wrapper = group()

    // On the element that contains the buttons. A `role="group"` on the wrapper
    // put the control's label inside its own group.
    expect(wrapper.get('[role="group"]').findAll('button')).toHaveLength(3)
    expect(wrapper.get('[role="group"]').text()).not.toContain('Size')
  })

  it('reads the four shapes an options prop comes in', () => {
    const labels = (options: unknown) => group({ options }).findAll('button').map(button => button.text())

    expect(labels(['sm', 'md'])).toEqual(['sm', 'md'])
    expect(labels([1, 2])).toEqual(['1', '2'])
    expect(labels([{ value: 'sm', label: 'Small' }])).toEqual(['Small'])
    expect(labels({ sm: 'Small', md: 'Medium' })).toEqual(['Small', 'Medium'])
  })
})
