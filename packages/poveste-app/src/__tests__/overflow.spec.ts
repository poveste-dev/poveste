import { describe, expect, it } from 'vitest'
import { visibleChildCount, visibleChildren } from '../app/util/overflow'

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

// The active tab always stays in the row (#1699, and the redesign's decision on #1667): when
// it would fall under "More", it takes the place of the tabs before it that no longer fit.
describe('visibleChildren', () => {
  it('shows the same children as the count when the active one fits anyway', () => {
    expect(visibleChildren(TABS, 230, BUTTON, 0)).toEqual([0, 1])
    expect(visibleChildren(TABS, 290, BUTTON, 3)).toEqual([0, 1, 2, 3])
  })

  it('keeps an active child that would overflow, giving up the ones before it that no longer fit', () => {
    // 80 + 69 fits in 230 - 32; 80 + 58 + 69 does not.
    expect(visibleChildren(TABS, 230, BUTTON, 2)).toEqual([0, 2])
  })

  it('keeps the last child when it is active', () => {
    // 80 + 58 + 58 fits in 230 - 32.
    expect(visibleChildren(TABS, 230, BUTTON, 3)).toEqual([0, 1, 3])
  })

  it('keeps the rest in order after a child it skipped for the active one', () => {
    expect(visibleChildren([50, 50, 50, 50, 50], 200, BUTTON, 4)).toEqual([0, 1, 4])
  })

  it('keeps the active child when it is the only one that fits, or not even that', () => {
    expect(visibleChildren(TABS, 100, BUTTON, 2)).toEqual([2])
    expect(visibleChildren(TABS, 60, BUTTON, 0)).toEqual([0])
  })

  it('falls back to the count without an active child', () => {
    expect(visibleChildren(TABS, 230, BUTTON)).toEqual([0, 1])
  })

  it('shows none before the menu has a width, active or not', () => {
    expect(visibleChildren(TABS, 0, BUTTON, 2)).toEqual([])
  })
})
