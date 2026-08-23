import type { Variant } from '../types'

/*
 * Grid cells are slots, not variants (#240). A slot keeps its component and its
 * sandbox iframe across the variants it shows, so handing it a new variant is a
 * retarget of a warm realm rather than a new document. What is on screen is
 * decided here; the grid only renders what it is given.
 */
export interface Slot {
  /** The story the variant belongs to; ids repeat across stories (`v1`). */
  storyId: string
  variant: Variant
  visible: boolean
  /** Position on screen — CSS `order`, since DOM order is slot order. */
  order: number
}

/**
 * Hand the visible variants to slots. Assignment is sticky: a variant that is
 * still visible keeps its slot, so a one-row scroll retargets one row's worth of
 * cells. A variant that scrolled out stays in its slot, hidden, until a new one
 * needs it — unmounting would throw the warm realm away, and the window wobbles
 * by a row while a scroll settles.
 */
export function assignSlots(slots: Slot[], storyId: string, visible: Variant[]): Slot[] {
  const position = new Map(visible.map((v, i) => [v.id, i]))
  const next: Slot[] = slots.map(slot => (
    slot.storyId === storyId && position.has(slot.variant.id)
      ? { ...slot, visible: true, order: position.get(slot.variant.id) }
      : { ...slot, visible: false, order: 0 }
  ))
  const placed = new Set(next.filter(s => s.visible).map(s => s.variant.id))
  for (const [i, variant] of visible.entries()) {
    if (placed.has(variant.id)) continue
    const slot: Slot = { storyId, variant, visible: true, order: i }
    const free = next.findIndex(s => !s.visible)
    if (free === -1) next.push(slot)
    else next[free] = slot
  }
  return next
}

/**
 * Let idle slots go once the window has settled. A hidden slot is a realm that
 * keeps running — timers, observers, a listener on every message — and with
 * sticky assignment alone the pool would be the largest window ever seen.
 *
 * Slots are keyed by index, so only the tail can be dropped without moving
 * anything. Trailing hidden slots go; interior ones stay as the spare for the
 * next scroll — until they outnumber the visible ones, when the pool is
 * compacted onto its first slots: a visible slot past that point moves down
 * into a hidden one, which is one retarget, and the rest is cut.
 */
export function trimSlots(slots: Slot[]): Slot[] {
  const visibleCount = slots.filter(s => s.visible).length
  const hiddenCount = slots.length - visibleCount
  if (hiddenCount === 0) return slots

  let next = slots
  if (hiddenCount > visibleCount) {
    const kept: (Slot | undefined)[] = slots.slice(0, visibleCount).map(s => (s.visible ? s : undefined))
    for (const slot of slots.slice(visibleCount)) {
      if (!slot.visible) continue
      kept[kept.indexOf(undefined)] = slot
    }
    next = kept as Slot[]
  }

  let end = next.length
  while (end > 0 && !next[end - 1].visible) end--
  return end === next.length ? next : next.slice(0, end)
}
