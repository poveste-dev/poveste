import { describe, expect, it } from 'vitest'
import { visibleChildCount } from '../app/util/overflow'

// The pane tabs with an "A11y" tab, as measured in the built vue book: 265 px in all.
const TABS = [80, 58, 69, 58]
const BUTTON = 32

describe('visibleChildCount', () => {
  it('shows every child when they fit, without setting the "More" button\'s width aside', () => {
    expect(visibleChildCount(TABS, 290, BUTTON)).toBe(4)
  })

  it('shows every child when they fill the width exactly', () => {
    expect(visibleChildCount(TABS, 265, BUTTON)).toBe(4)
  })

  it('sets the button\'s width aside once a child overflows', () => {
    expect(visibleChildCount(TABS, 264, BUTTON)).toBe(3)
  })

  it('hides a child the button would cover, though it fits without the button', () => {
    expect(visibleChildCount(TABS, 230, BUTTON)).toBe(2)
  })

  it('shows none before the menu has a width', () => {
    expect(visibleChildCount(TABS, 0, BUTTON)).toBe(0)
  })
})
