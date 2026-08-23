import type { Variant } from '../app/types'
import type { Slot } from '../app/util/grid-slots.js'
import { describe, expect, it } from 'vitest'
import { assignSlots, trimSlots } from '../app/util/grid-slots.js'

function variants(ids: string[]): Variant[] {
  return ids.map(id => ({ id }) as Variant)
}

function shown(slots: Slot[]) {
  return slots.map(s => (s.visible ? `${s.storyId}:${s.variant.id}@${s.order}` : `(${s.storyId}:${s.variant.id})`))
}

describe('assignSlots', () => {
  it('opens a slot per visible variant in screen order', () => {
    const slots = assignSlots([], 'a', variants(['v1', 'v2', 'v3']))

    expect(shown(slots)).toEqual(['a:v1@0', 'a:v2@1', 'a:v3@2'])
  })

  it('keeps a still-visible variant in its slot when the window moves', () => {
    const first = assignSlots([], 'a', variants(['v1', 'v2', 'v3']))

    const next = assignSlots(first, 'a', variants(['v2', 'v3', 'v4']))

    expect(shown(next)).toEqual(['a:v4@2', 'a:v2@0', 'a:v3@1'])
  })

  it('hides a slot whose variant left rather than dropping it', () => {
    const first = assignSlots([], 'a', variants(['v1', 'v2', 'v3']))

    const next = assignSlots(first, 'a', variants(['v2', 'v3']))

    expect(shown(next)).toEqual(['(a:v1)', 'a:v2@0', 'a:v3@1'])
  })

  it('hands a hidden slot to a variant coming in before opening a new one', () => {
    const first = assignSlots([], 'a', variants(['v1', 'v2', 'v3']))
    const hidden = assignSlots(first, 'a', variants(['v2', 'v3']))

    const next = assignSlots(hidden, 'a', variants(['v2', 'v3', 'v4']))

    expect(shown(next)).toEqual(['a:v4@2', 'a:v2@0', 'a:v3@1'])
  })

  it('does not match a variant of another story by id', () => {
    const first = assignSlots([], 'a', variants(['v1', 'v2']))

    const next = assignSlots(first, 'b', variants(['v1', 'v2']))

    expect(next.map(s => s.storyId)).toEqual(['b', 'b'])
    expect(next.every(s => s.visible)).toBe(true)
    expect(next[0].variant).not.toBe(first[0].variant)
  })
})

describe('trimSlots', () => {
  it('leaves a pool with nothing hidden alone', () => {
    const slots = assignSlots([], 'a', variants(['v1', 'v2']))

    expect(trimSlots(slots)).toBe(slots)
  })

  it('drops trailing hidden slots and keeps interior ones as spares', () => {
    const first = assignSlots([], 'a', variants(['v1', 'v2', 'v3', 'v4']))
    const moved = assignSlots(first, 'a', variants(['v1', 'v3', 'v5']))
    expect(shown(moved)).toEqual(['a:v1@0', 'a:v5@2', 'a:v3@1', '(a:v4)'])

    const next = trimSlots(moved)

    expect(shown(next)).toEqual(['a:v1@0', 'a:v5@2', 'a:v3@1'])
  })

  it('compacts the pool when hidden slots outnumber visible ones', () => {
    const big = assignSlots([], 'a', variants(['v1', 'v2', 'v3', 'v4', 'v5', 'v6']))
    const small = assignSlots(big, 'a', variants(['v2', 'v6']))
    expect(shown(small)).toEqual(['(a:v1)', 'a:v2@0', '(a:v3)', '(a:v4)', '(a:v5)', 'a:v6@1'])

    const next = trimSlots(small)

    // v2 stays where it is; v6 moves down into the first free slot.
    expect(shown(next)).toEqual(['a:v6@1', 'a:v2@0'])
  })
})
