import { mount } from '@vue/test-utils'
import HstSlider from './HstSlider.vue'

/*
 * The tooltip's position is a unitless fraction handed to CSS, so `calc()` can
 * resolve it against a live `100%`. The pixel offset this replaced was computed
 * from `clientWidth` inside a computed that nothing invalidated on a resize
 * (#996), and every assertion here fails against it — it set `left`, not this.
 */
function fraction(props: Record<string, unknown>) {
  const wrapper = mount(HstSlider, { props: { min: 0, max: 100, title: 'Opacity', ...props } })
  return wrapper.get('input').trigger('mouseover').then(() =>
    wrapper.get('.poveste-slider-tooltip-anchor').attributes('style') ?? '',
  )
}

describe('the slider tooltip position', () => {
  it('is the fraction of the way along, not a pixel offset', async () => {
    expect(await fraction({ modelValue: 20 })).toContain('--_poveste-slider-fraction: 0.2')
  })

  it('is 0 at the minimum, and with no value at all', async () => {
    expect(await fraction({ modelValue: 0 })).toContain('--_poveste-slider-fraction: 0')
    expect(await fraction({ modelValue: null })).toContain('--_poveste-slider-fraction: 0')
  })

  it('is 1 at the maximum', async () => {
    expect(await fraction({ modelValue: 100 })).toContain('--_poveste-slider-fraction: 1')
  })

  // The range need not start at zero, and the old arithmetic got this right —
  // it is here so a rewrite of the fraction cannot quietly drop it.
  it('is measured across the range rather than from zero', async () => {
    expect(await fraction({ modelValue: 15, min: 10, max: 20 })).toContain('--_poveste-slider-fraction: 0.5')
  })

  it('carries no pixel `left`, which is what could not survive a resize', async () => {
    expect(await fraction({ modelValue: 20 })).not.toMatch(/left:\s*\d/)
  })
})
