/**
 * How many children of an overflow menu fit in `available` pixels, in order. The "More" button
 * shows only once something overflows, so its width is set aside only then.
 */
export function visibleChildCount(widths: number[], available: number, buttonWidth: number): number {
  if (widths.reduce((sum, width) => sum + width, 0) <= available) {
    return widths.length
  }
  let used = 0
  for (const [index, width] of widths.entries()) {
    used += width
    if (used > available - buttonWidth) {
      return index
    }
  }
  return widths.length
}

/**
 * Which children of an overflow menu stay in the row, in order. The active child always does:
 * when it would fall under "More", its width is set aside first and the children before it fill
 * what is left, so the row never hides the tab that is showing (#1699).
 */
export function visibleChildren(widths: number[], available: number, buttonWidth: number, active?: number): number[] {
  if (active == null || active < 0 || active >= widths.length) {
    return widths.slice(0, visibleChildCount(widths, available, buttonWidth)).map((_, index) => index)
  }
  if (available <= 0) {
    return []
  }
  if (widths.reduce((sum, width) => sum + width, 0) <= available) {
    return widths.map((_, index) => index)
  }
  const visible: number[] = []
  let used = widths[active]!
  for (const [index, width] of widths.entries()) {
    if (index === active) {
      visible.push(index)
      continue
    }
    if (used + width > available - buttonWidth) {
      break
    }
    used += width
    visible.push(index)
  }
  if (!visible.includes(active)) {
    visible.push(active)
  }
  return visible
}
