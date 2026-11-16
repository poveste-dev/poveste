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
